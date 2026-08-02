import { prisma } from '../config/prisma.js'
import { createNotification } from './notification.service.js'

const MULTI_REPORT_THRESHOLD = 3
const MULTI_REPORT_WINDOW_MINUTES = 30

const CATEGORY_META = {
  SPAM: { label: 'Spam', priority: 10, critical: false },
  SEXUAL_CONTENT: { label: 'Contenido sexual o desnudez', priority: 40, critical: false },
  HATE_SPEECH: { label: 'Discurso de odio o discriminación', priority: 60, critical: false },
  HARASSMENT_BULLYING: { label: 'Acoso o bullying', priority: 50, critical: false },
  VIOLENCE_GRAPHIC: { label: 'Violencia o contenido gráfico/perturbador', priority: 80, critical: true },
  MISINFORMATION: { label: 'Información falsa o engañosa', priority: 30, critical: false },
  SELF_HARM_SUICIDE: { label: 'Autolesión o suicidio', priority: 90, critical: true },
  MINOR_SAFETY: { label: 'Explotación o riesgo para menores', priority: 100, critical: true },
  IMPERSONATION: { label: 'Suplantación de identidad', priority: 45, critical: false },
  COPYRIGHT_IP: { label: 'Infracción de derechos de autor / propiedad intelectual', priority: 35, critical: false },
  ILLEGAL_SALES: { label: 'Venta de productos o servicios ilegales', priority: 70, critical: false },
  OTHER: { label: 'Otro', priority: 20, critical: false },
}

function getCategoryMeta(category) {
  return CATEGORY_META[category] ?? CATEGORY_META.OTHER
}

function assertOneTarget({ postId, userId }) {
  if (Boolean(postId) === Boolean(userId)) {
    throw Object.assign(new Error('Debes reportar exactamente una publicación o un usuario'), {
      statusCode: 400,
    })
  }
}

function assertActionPermission(moderator, actionType) {
  const isAdminModerator = moderator?.role === 'ADMIN' || moderator?.moderationRole === 'ADMIN'
  const juniorAllowed = new Set(['DISMISS_REPORT', 'ISSUE_WARNING', 'DELETE_POST'])
  if (!isAdminModerator && !juniorAllowed.has(actionType)) {
    throw Object.assign(
      new Error('Tu rol de moderación no permite aplicar suspensiones o baneos permanentes'),
      { statusCode: 403 },
    )
  }
}

function actionAffectsTargetUser(actionType) {
  return (
    actionType === 'ISSUE_WARNING' ||
    actionType === 'SUSPEND_TEMPORARY' ||
    actionType === 'SUSPEND_PERMANENT' ||
    actionType === 'DELETE_POST'
  )
}

function assertCanModerateTarget(moderator, targetUser) {
  if (!targetUser) {
    throw Object.assign(new Error('Usuario objetivo no encontrado'), { statusCode: 404 })
  }

  if (Number(moderator.id) === Number(targetUser.id)) {
    throw Object.assign(new Error('No puedes aplicar acciones de moderación sobre tu propia cuenta'), {
      statusCode: 403,
    })
  }

  if (targetUser.role === 'ADMIN' || targetUser.moderationRole === 'ADMIN') {
    throw Object.assign(new Error('No puedes aplicar esta acción sobre otro administrador'), {
      statusCode: 403,
    })
  }
}

async function writeAuditLog(tx, actorId, eventType, details, actionId = null) {
  await tx.moderationAuditLog.create({
    data: {
      actorId: Number(actorId),
      actionId,
      eventType,
      details,
    },
  })
}

async function notifyUserModerationEvent(userId, content, actorId = null) {
  try {
    await createNotification(userId, {
      actorId,
      type: 'MODERATION',
      content,
    })
  } catch {
    // notification failures should not rollback moderation decisions
  }
}

async function updateCaseAggregation(tx, moderationCaseId) {
  const reports = await tx.report.findMany({
    where: { caseId: moderationCaseId },
    select: { reporterId: true, category: true, createdAt: true },
  })

  const reportsCount = reports.length
  const distinctReportersCount = new Set(reports.map((item) => item.reporterId)).size
  const priorityScore = reports.reduce(
    (acc, item) => Math.max(acc, getCategoryMeta(item.category).priority),
    0,
  )

  await tx.moderationCase.update({
    where: { id: moderationCaseId },
    data: {
      reportsCount,
      distinctReportersCount,
      priorityScore,
      lastReportedAt: new Date(),
    },
  })
}

async function maybeAutoShadowHide(tx, moderationCase) {
  const since = new Date(Date.now() - MULTI_REPORT_WINDOW_MINUTES * 60 * 1000)
  const distinctRecentReporters = await tx.report.findMany({
    where: {
      caseId: moderationCase.id,
      createdAt: { gte: since },
    },
    select: { reporterId: true },
    distinct: ['reporterId'],
  })

  if (distinctRecentReporters.length < MULTI_REPORT_THRESHOLD) {
    return false
  }

  const post = await tx.post.findUnique({
    where: { id: moderationCase.postId },
    select: { id: true, hiddenAt: true },
  })

  if (!post || post.hiddenAt) {
    return false
  }

  const now = new Date()
  await tx.post.update({
    where: { id: post.id },
    data: { hiddenAt: now },
  })
  await tx.moderationCase.update({
    where: { id: moderationCase.id },
    data: { autoHiddenAt: now },
  })
  return true
}

async function createWarningWithEscalation(tx, {
  moderatorId,
  moderationCaseId,
  targetUserId,
  reason,
  reportId,
  targetPostId,
  moderationActionId = null,
}) {
  const action = moderationActionId
    ? { id: Number(moderationActionId) }
    : await tx.moderationAction.create({
      data: {
        actionType: 'ISSUE_WARNING',
        reason,
        moderatorId,
        caseId: moderationCaseId,
        reportId,
        targetUserId,
        targetPostId,
      },
    })

  await tx.userWarning.create({
    data: {
      userId: targetUserId,
      moderationActionId: action.id,
      reason,
    },
  })

  const warningsCount = await tx.userWarning.count({
    where: { userId: targetUserId },
  })

  const generatedActionIds = [action.id]
  let restrictionUntil = null
  let accountSuspensionUntil = null

  if (warningsCount === 2) {
    const restrictionAction = await tx.moderationAction.create({
      data: {
        actionType: 'COMMENT_RESTRICTION_24H',
        reason: 'Segunda advertencia: restricción temporal de comentarios por 24 horas',
        moderatorId,
        caseId: moderationCaseId,
        targetUserId,
        targetPostId,
      },
    })
    generatedActionIds.push(restrictionAction.id)
    restrictionUntil = new Date(Date.now() + 24 * 60 * 60 * 1000)
    await tx.userSuspension.create({
      data: {
        userId: targetUserId,
        moderationActionId: restrictionAction.id,
        type: 'TEMPORARY',
        scope: 'COMMENT_ONLY',
        startAt: new Date(),
        endAt: restrictionUntil,
        reason: 'Restricción temporal de comentarios por reincidencia',
      },
    })
  }

  if (warningsCount >= 3) {
    const autoSuspendAction = await tx.moderationAction.create({
      data: {
        actionType: 'AUTO_SUSPEND_7_DAYS',
        reason: 'Suspensión automática por acumular 3 o más advertencias',
        durationHours: 24 * 7,
        moderatorId,
        caseId: moderationCaseId,
        targetUserId,
        targetPostId,
      },
    })
    generatedActionIds.push(autoSuspendAction.id)
    accountSuspensionUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await tx.userSuspension.create({
      data: {
        userId: targetUserId,
        moderationActionId: autoSuspendAction.id,
        type: 'TEMPORARY',
        scope: 'ACCOUNT',
        startAt: new Date(),
        endAt: accountSuspensionUntil,
        reason: 'Suspensión automática por acumulación de advertencias',
      },
    })
  }

  return { actionId: action.id, warningsCount, generatedActionIds, restrictionUntil, accountSuspensionUntil }
}

function toPublicCase(caseRow) {
  const latestActionRow = Array.isArray(caseRow.actions) ? caseRow.actions[0] : null
  const latestAction = latestActionRow
    ? {
      id: latestActionRow.id,
      actionType: latestActionRow.actionType,
      reason: latestActionRow.reason,
      createdAt: latestActionRow.createdAt,
      moderator: latestActionRow.moderator
        ? { id: latestActionRow.moderator.id, username: latestActionRow.moderator.username }
        : null,
    }
    : null

  return {
    id: caseRow.id,
    postId: caseRow.postId,
    status: caseRow.status,
    priorityScore: caseRow.priorityScore,
    reportsCount: caseRow.reportsCount,
    distinctReportersCount: caseRow.distinctReportersCount,
    lastReportedAt: caseRow.lastReportedAt,
    autoHiddenAt: caseRow.autoHiddenAt,
    post: caseRow.post,
    latestAction,
  }
}

export async function createReport(reporterId, { postId, userId, category, details }) {
  assertOneTarget({ postId, userId })
  const normalizedReporterId = Number(reporterId)
  const meta = getCategoryMeta(category)
  const detailsText = String(details ?? '').trim()

  if (category === 'OTHER' && detailsText.length < 20) {
    throw Object.assign(new Error('Debes explicar el motivo con al menos 20 caracteres en la categoría "Otro"'), {
      statusCode: 400,
    })
  }

  if (userId) {
    const normalizedTargetUserId = Number(userId)
    const targetUser = await prisma.user.findUnique({
      where: { id: normalizedTargetUserId },
      select: { id: true },
    })
    if (!targetUser) {
      throw Object.assign(new Error('El usuario reportado no existe'), { statusCode: 404 })
    }
    if (normalizedTargetUserId === normalizedReporterId) {
      throw Object.assign(new Error('No puedes reportarte a ti mismo'), { statusCode: 400 })
    }

    const report = await prisma.report.create({
      data: {
        reporterId: normalizedReporterId,
        reportedUserId: normalizedTargetUserId,
        category,
        reason: meta.label,
        details: detailsText || null,
        status: 'OPEN',
      },
    })
    return report
  }

  const normalizedPostId = Number(postId)
  const created = await prisma.$transaction(async (tx) => {
    const post = await tx.post.findUnique({
      where: { id: normalizedPostId },
      select: { id: true, authorId: true, hiddenAt: true, title: true },
    })

    if (!post) {
      throw Object.assign(new Error('La publicación reportada no existe'), { statusCode: 404 })
    }

    if (post.authorId === normalizedReporterId) {
      throw Object.assign(new Error('No puedes reportar tu propia publicación'), { statusCode: 400 })
    }

    const moderationCase = await tx.moderationCase.upsert({
      where: { postId: normalizedPostId },
      create: {
        postId: normalizedPostId,
        status: 'OPEN',
        priorityScore: meta.priority,
        reportsCount: 0,
        distinctReportersCount: 0,
        lastReportedAt: new Date(),
      },
      update: {},
    })

    const existing = await tx.report.findFirst({
      where: {
        reporterId: normalizedReporterId,
        postId: normalizedPostId,
      },
    })

    let report
    if (existing) {
      report = await tx.report.update({
        where: { id: existing.id },
        data: {
          category,
          reason: meta.label,
          details: detailsText || null,
          status: 'OPEN',
          reviewedAt: null,
          caseId: moderationCase.id,
        },
      })
    } else {
      report = await tx.report.create({
        data: {
          reporterId: normalizedReporterId,
          postId: normalizedPostId,
          category,
          reason: meta.label,
          details: detailsText || null,
          status: 'OPEN',
          caseId: moderationCase.id,
        },
      })
    }

    await updateCaseAggregation(tx, moderationCase.id)
    const autoHidden = await maybeAutoShadowHide(tx, moderationCase)
    await tx.moderationCase.update({
      where: { id: moderationCase.id },
      data: { status: 'OPEN' },
    })

    await writeAuditLog(
      tx,
      normalizedReporterId,
      'REPORT_CREATED',
      {
        reportId: report.id,
        caseId: moderationCase.id,
        postId: normalizedPostId,
        category,
        autoHidden,
      },
      null,
    )

    const updatedCase = await tx.moderationCase.findUnique({
      where: { id: moderationCase.id },
      include: {
        post: {
          select: {
            id: true,
            title: true,
            authorId: true,
            hiddenAt: true,
          },
        },
      },
    })

    return { report, moderationCase: updatedCase }
  })

  return {
    ...created.report,
    moderationCase: toPublicCase(created.moderationCase),
  }
}

export async function toggleRelation(model, ownerField, targetField, ownerId, targetId) {
  if (ownerId === targetId) {
    throw Object.assign(new Error('No puedes aplicar esta acción sobre tu propia cuenta'), {
      statusCode: 400,
    })
  }
  const target = await prisma.user.findUnique({ where: { id: targetId } })
  if (!target) throw Object.assign(new Error('Usuario no encontrado'), { statusCode: 404 })
  const key = { [ownerField]: ownerId, [targetField]: targetId }
  const existing = await prisma[model].findUnique({ where: { [`${ownerField}_${targetField}`]: key } })
  if (existing) {
    await prisma[model].delete({ where: { [`${ownerField}_${targetField}`]: key } })
    return false
  }
  await prisma[model].create({ data: key })
  return true
}

export async function getReports({ cursor, limit = 20, status, bucket = 'all' }) {
  const take = Math.min(Math.max(Number(limit) || 20, 1), 50)
  let where = status ? { status } : {}
  if (!status && bucket === 'pending') where = { status: { in: ['OPEN', 'REVIEWING'] } }
  if (!status && bucket === 'resolved') where = { status: { in: ['RESOLVED', 'DISMISSED'] } }
  const rows = await prisma.moderationCase.findMany({
    where,
    take: take + 1,
    ...(cursor ? { cursor: { id: Number(cursor) }, skip: 1 } : {}),
    orderBy: [{ priorityScore: 'desc' }, { lastReportedAt: 'desc' }, { id: 'desc' }],
    include: {
      post: {
        select: {
          id: true,
          title: true,
          authorId: true,
          hiddenAt: true,
          author: {
            select: { id: true, username: true },
          },
        },
      },
      reports: {
        take: 3,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          category: true,
          reason: true,
          details: true,
          createdAt: true,
          reporter: { select: { id: true, username: true } },
        },
      },
      actions: {
        take: 1,
        orderBy: { createdAt: 'desc' },
        include: {
          moderator: { select: { id: true, username: true } },
        },
      },
    },
  })

  const hasMore = rows.length > take
  const items = hasMore ? rows.slice(0, take) : rows
  return {
    items: items.map(toPublicCase),
    nextCursor: hasMore ? items[take - 1].id : null,
  }
}

export async function getReportCaseById(caseId) {
  const row = await prisma.moderationCase.findUnique({
    where: { id: Number(caseId) },
    include: {
      post: {
        select: {
          id: true,
          title: true,
          content: true,
          imageUrl: true,
          hiddenAt: true,
          createdAt: true,
          author: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
            },
          },
        },
      },
      reports: {
        orderBy: { createdAt: 'desc' },
        include: {
          reporter: {
            select: { id: true, username: true, avatarUrl: true },
          },
        },
      },
      actions: {
        orderBy: { createdAt: 'desc' },
        include: {
          moderator: {
            select: { id: true, username: true },
          },
        },
      },
    },
  })

  if (!row) throw Object.assign(new Error('Caso de moderación no encontrado'), { statusCode: 404 })
  return row
}

export async function updateModerationCaseStatus(caseId, status, moderatorId) {
  const row = await prisma.moderationCase.findUnique({
    where: { id: Number(caseId) },
  })
  if (!row) throw Object.assign(new Error('Caso de moderación no encontrado'), { statusCode: 404 })

  await prisma.$transaction(async (tx) => {
    await tx.moderationCase.update({
      where: { id: row.id },
      data: { status },
    })
    await tx.report.updateMany({
      where: { caseId: row.id },
      data: {
        status,
        reviewedAt: status === 'OPEN' ? null : new Date(),
      },
    })
    await writeAuditLog(tx, moderatorId, 'CASE_STATUS_UPDATED', {
      caseId: row.id,
      status,
    })
  })
}

export async function applyModerationAction(caseId, moderator, payload) {
  const moderationCase = await prisma.moderationCase.findUnique({
    where: { id: Number(caseId) },
    include: {
      post: {
        select: { id: true, title: true, authorId: true, hiddenAt: true },
      },
      reports: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { id: true },
      },
    },
  })

  if (!moderationCase) {
    throw Object.assign(new Error('Caso de moderación no encontrado'), { statusCode: 404 })
  }

  // TODO(Fase B): cuando ModerationCase incluya targetUserId para casos de usuario,
  // resolver el objetivo desde ese campo y no solo desde post.authorId.
  // FASE B: no usar targetUserId de ModerationCase todavía (campo no migrado en schema actual).
  const targetUserIdFromCase = moderationCase.targetUserId ?? null
  const targetUserId = targetUserIdFromCase || moderationCase.post?.authorId || null
  const targetPostId = moderationCase.post?.id || null

  if (!targetUserId) {
    throw Object.assign(new Error('No se pudo resolver el usuario objetivo del caso'), { statusCode: 400 })
  }

  const selectedActionTypes = []
  if (payload.dismiss) {
    selectedActionTypes.push('DISMISS_REPORT')
  } else {
    if (payload.contentAction === 'DELETE_POST') selectedActionTypes.push('DELETE_POST')
    if (payload.sanctionAction) selectedActionTypes.push(payload.sanctionAction)
  }

  for (const actionType of selectedActionTypes) {
    assertActionPermission(moderator, actionType)
  }

  if (payload.sanctionAction) {
    const targetUser = await prisma.user.findUnique({
      where: { id: Number(targetUserId) },
      select: { id: true, role: true, moderationRole: true },
    })
    assertCanModerateTarget(moderator, targetUser)
  }

  const execution = await prisma.$transaction(async (tx) => {
    const createdActions = []
    const nextCaseStatus = payload.dismiss ? 'DISMISSED' : 'RESOLVED'
    let warningResult = null
    let suspension = null

    const createAction = async (actionType, durationHours = null) => {
      const action = await tx.moderationAction.create({
        data: {
          actionType,
          reason: payload.reason,
          durationHours,
          moderatorId: Number(moderator.id),
          caseId: moderationCase.id,
          reportId: moderationCase.reports[0]?.id ?? null,
          targetUserId,
          targetPostId,
        },
        include: {
          moderator: { select: { id: true, username: true } },
        },
      })

      createdActions.push(action)
      await writeAuditLog(
        tx,
        Number(moderator.id),
        'MODERATION_ACTION_APPLIED',
        {
          caseId: moderationCase.id,
          postId: targetPostId,
          targetUserId,
          actionType,
          reason: payload.reason,
          durationHours: durationHours ?? null,
        },
        action.id,
      )
      return action
    }

    if (payload.dismiss) {
      await createAction('DISMISS_REPORT', null)
    } else {
      if (payload.contentAction === 'DELETE_POST') {
        await createAction('DELETE_POST', null)
        if (targetPostId) {
          await tx.post.update({
            where: { id: targetPostId },
            data: { hiddenAt: new Date() },
          })
        }
      }

      if (payload.sanctionAction === 'ISSUE_WARNING') {
        const warningAction = await createAction('ISSUE_WARNING', null)
        warningResult = await createWarningWithEscalation(tx, {
          moderatorId: Number(moderator.id),
          moderationCaseId: moderationCase.id,
          targetUserId,
          reason: payload.reason,
          reportId: moderationCase.reports[0]?.id ?? null,
          targetPostId,
          moderationActionId: warningAction.id,
        })
      }

      if (payload.sanctionAction === 'SUSPEND_TEMPORARY') {
        const durationHours = Number(payload.durationHours)
        const suspendAction = await createAction('SUSPEND_TEMPORARY', durationHours)
        const endAt = new Date(Date.now() + durationHours * 60 * 60 * 1000)
        suspension = await tx.userSuspension.create({
          data: {
            userId: targetUserId,
            moderationActionId: suspendAction.id,
            type: 'TEMPORARY',
            scope: 'ACCOUNT',
            startAt: new Date(),
            endAt,
            reason: payload.reason,
          },
        })
      }

      if (payload.sanctionAction === 'SUSPEND_PERMANENT') {
        const suspendAction = await createAction('SUSPEND_PERMANENT', null)
        suspension = await tx.userSuspension.create({
          data: {
            userId: targetUserId,
            moderationActionId: suspendAction.id,
            type: 'PERMANENT',
            scope: 'ACCOUNT',
            startAt: new Date(),
            endAt: null,
            reason: payload.reason,
          },
        })
      }
    }

    await tx.report.updateMany({
      where: { caseId: moderationCase.id },
      data: {
        status: nextCaseStatus,
        reviewedAt: new Date(),
      },
    })

    await tx.moderationCase.update({
      where: { id: moderationCase.id },
      data: { status: nextCaseStatus },
    })

    const updatedCase = await tx.moderationCase.findUnique({
      where: { id: moderationCase.id },
      include: {
        post: {
          select: {
            id: true,
            title: true,
            content: true,
            imageUrl: true,
            hiddenAt: true,
            createdAt: true,
            author: {
              select: {
                id: true,
                username: true,
                avatarUrl: true,
              },
            },
          },
        },
        reports: {
          orderBy: { createdAt: 'desc' },
          include: {
            reporter: {
              select: { id: true, username: true, avatarUrl: true },
            },
          },
        },
        actions: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: {
            moderator: {
              select: { id: true, username: true },
            },
          },
        },
      },
    })

    return { createdActions, warningResult, suspension, nextCaseStatus, updatedCase }
  })

  const hasAction = (actionType) => execution.createdActions.some((action) => action.actionType === actionType)

  if (hasAction('ISSUE_WARNING')) {
    await notifyUserModerationEvent(
      targetUserId,
      `Recibiste una advertencia: ${payload.reason}`,
      Number(moderator.id),
    )
    if (execution.warningResult?.restrictionUntil) {
      await notifyUserModerationEvent(
        targetUserId,
        `Tienes restricción para comentar hasta ${execution.warningResult.restrictionUntil.toISOString()}`,
        Number(moderator.id),
      )
    }
    if (execution.warningResult?.accountSuspensionUntil) {
      await notifyUserModerationEvent(
        targetUserId,
        `Tu cuenta fue suspendida automáticamente hasta ${execution.warningResult.accountSuspensionUntil.toISOString()}`,
        Number(moderator.id),
      )
    }
  }

  if (hasAction('SUSPEND_TEMPORARY') && execution.suspension?.endAt) {
    await notifyUserModerationEvent(
      targetUserId,
      `Tu cuenta fue suspendida hasta ${new Date(execution.suspension.endAt).toISOString()}. Motivo: ${payload.reason}`,
      Number(moderator.id),
    )
  }

  if (hasAction('SUSPEND_PERMANENT')) {
    await notifyUserModerationEvent(
      targetUserId,
      `Tu cuenta fue suspendida permanentemente. Motivo: ${payload.reason}`,
      Number(moderator.id),
    )
  }

  if (hasAction('DELETE_POST')) {
    await notifyUserModerationEvent(
      targetUserId,
      `Una de tus publicaciones fue retirada por moderación. Motivo: ${payload.reason}`,
      Number(moderator.id),
    )
  }

  return {
    ...execution,
    updatedCase: execution.updatedCase ? toPublicCase(execution.updatedCase) : null,
  }
}

export async function getUserModerationHistory(userId) {
  const normalizedUserId = Number(userId)
  const [warnings, suspensions, actions, openAppeals] = await Promise.all([
    prisma.userWarning.findMany({
      where: { userId: normalizedUserId },
      orderBy: { createdAt: 'desc' },
      include: {
        moderationAction: {
          include: { moderator: { select: { id: true, username: true } } },
        },
      },
    }),
    prisma.userSuspension.findMany({
      where: { userId: normalizedUserId },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.moderationAction.findMany({
      where: { targetUserId: normalizedUserId },
      orderBy: { createdAt: 'desc' },
      include: {
        moderator: { select: { id: true, username: true } },
      },
    }),
    prisma.moderationAppeal.count({
      where: { userId: normalizedUserId, status: { in: ['PENDING', 'REVIEWING'] } },
    }),
  ])

  return {
    warningsCount: warnings.length,
    warnings,
    suspensions,
    actions,
    openAppeals,
  }
}

export async function listModeratedUsers({ q = '', status = 'ALL', limit = 50 } = {}) {
  const now = new Date()
  const rows = await prisma.user.findMany({
    where: {
      ...(q ? { username: { contains: q, mode: 'insensitive' } } : {}),
      OR: [
        {
          suspensions: {
            some: {
              active: true,
              scope: 'ACCOUNT',
              OR: [{ type: 'PERMANENT' }, { endAt: { gt: now } }],
            },
          },
        },
        { warnings: { some: {} } },
      ],
    },
    take: Math.min(Math.max(Number(limit) || 50, 1), 100),
    orderBy: { username: 'asc' },
    select: {
      id: true,
      username: true,
      role: true,
      moderationRole: true,
      suspensions: {
        where: {
          active: true,
          scope: 'ACCOUNT',
          OR: [{ type: 'PERMANENT' }, { endAt: { gt: now } }],
        },
        orderBy: { createdAt: 'desc' },
        include: {
          moderationAction: {
            include: { moderator: { select: { id: true, username: true } } },
          },
        },
      },
      warnings: {
        take: 1,
        orderBy: { createdAt: 'desc' },
        include: {
          moderationAction: {
            include: { moderator: { select: { id: true, username: true } } },
          },
        },
      },
    },
  })

  const items = rows
    .map((user) => {
      const activePermanent = user.suspensions.find((suspension) => suspension.type === 'PERMANENT')
      const activeTemporary = user.suspensions.find((suspension) => suspension.type === 'TEMPORARY')
      const latestWarning = user.warnings[0] ?? null

      if (activePermanent) {
        return {
          user: { id: user.id, username: user.username, role: user.role, moderationRole: user.moderationRole },
          status: 'BANNED_PERMANENT',
          revocable: true,
          suspensionId: activePermanent.id,
          expiresAt: null,
          action: {
            reason: activePermanent.reason,
            createdAt: activePermanent.createdAt,
            moderator: activePermanent.moderationAction?.moderator ?? null,
          },
        }
      }

      if (activeTemporary) {
        return {
          user: { id: user.id, username: user.username, role: user.role, moderationRole: user.moderationRole },
          status: 'SUSPENDED_TEMPORARY',
          revocable: true,
          suspensionId: activeTemporary.id,
          expiresAt: activeTemporary.endAt,
          action: {
            reason: activeTemporary.reason,
            createdAt: activeTemporary.createdAt,
            moderator: activeTemporary.moderationAction?.moderator ?? null,
          },
        }
      }

      return {
        user: { id: user.id, username: user.username, role: user.role, moderationRole: user.moderationRole },
        status: 'WARNING',
        revocable: false,
        suspensionId: null,
        expiresAt: null,
        action: latestWarning
          ? {
            reason: latestWarning.reason,
            createdAt: latestWarning.createdAt,
            moderator: latestWarning.moderationAction?.moderator ?? null,
          }
          : null,
      }
    })
    .filter(Boolean)

  const filtered = status === 'ALL' ? items : items.filter((item) => item.status === status)
  return { items: filtered }
}

export async function revokeUserSanction({ targetUserId, suspensionId, moderator, reason }) {
  const normalizedTargetUserId = Number(targetUserId)
  const normalizedSuspensionId = Number(suspensionId)
  const now = new Date()
  const normalizedReason = String(reason).trim()

  const suspension = await prisma.userSuspension.findFirst({
    where: {
      id: normalizedSuspensionId,
      userId: normalizedTargetUserId,
      active: true,
      scope: 'ACCOUNT',
    },
    include: {
      user: {
        select: { id: true, username: true, role: true, moderationRole: true },
      },
    },
  })

  if (!suspension) {
    throw Object.assign(new Error('Sanción activa no encontrada'), { statusCode: 404 })
  }

  assertCanModerateTarget(moderator, suspension.user)

  if (suspension.type === 'TEMPORARY' && suspension.endAt && new Date(suspension.endAt).getTime() <= now.getTime()) {
    throw Object.assign(new Error('La suspensión temporal ya expiró y no requiere revocación'), {
      statusCode: 409,
    })
  }

  await prisma.$transaction(async (tx) => {
    await tx.userSuspension.update({
      where: { id: suspension.id },
      data: {
        active: false,
        endAt: now,
      },
    })

    await writeAuditLog(
      tx,
      Number(moderator.id),
      'SANCTION_REVOKED',
      {
        suspensionId: suspension.id,
        targetUserId: suspension.userId,
        reason: normalizedReason,
        previousType: suspension.type,
      },
      null,
    )
  })

  await notifyUserModerationEvent(
    suspension.userId,
    `Tu sanción fue revocada por moderación. Motivo: ${normalizedReason}`,
    Number(moderator.id),
  )

  return {
    suspensionId: suspension.id,
    userId: suspension.userId,
    revokedAt: now.toISOString(),
  }
}

export async function reopenModerationCase({ caseId, moderator, reason }) {
  const normalizedCaseId = Number(caseId)
  const normalizedReason = String(reason ?? '').trim()

  const row = await prisma.moderationCase.findUnique({
    where: { id: normalizedCaseId },
    include: {
      post: {
        select: {
          id: true,
          title: true,
          authorId: true,
          hiddenAt: true,
          author: {
            select: { id: true, username: true },
          },
        },
      },
      actions: {
        take: 1,
        orderBy: { createdAt: 'desc' },
        include: {
          moderator: { select: { id: true, username: true } },
        },
      },
    },
  })

  if (!row) {
    throw Object.assign(new Error('Caso de moderación no encontrado'), { statusCode: 404 })
  }

  if (row.status === 'REVIEWING') {
    throw Object.assign(new Error('El caso ya se encuentra en revisión'), { statusCode: 409 })
  }

  if (row.status !== 'RESOLVED' && row.status !== 'DISMISSED') {
    throw Object.assign(
      new Error('Solo se pueden reabrir casos resueltos o descartados'),
      { statusCode: 409 },
    )
  }

  const previousStatus = row.status

  await prisma.$transaction(async (tx) => {
    await tx.moderationCase.update({
      where: { id: row.id },
      data: { status: 'REVIEWING' },
    })

    await tx.report.updateMany({
      where: { caseId: row.id },
      data: {
        status: 'REVIEWING',
        reviewedAt: null,
      },
    })

    await writeAuditLog(
      tx,
      Number(moderator.id),
      'CASE_REOPENED',
      {
        caseId: row.id,
        previousStatus,
        nextStatus: 'REVIEWING',
        reason: normalizedReason,
      },
      null,
    )
  })

  const updatedCase = await prisma.moderationCase.findUnique({
    where: { id: row.id },
    include: {
      post: {
        select: {
          id: true,
          title: true,
          authorId: true,
          hiddenAt: true,
          author: {
            select: { id: true, username: true },
          },
        },
      },
      actions: {
        take: 1,
        orderBy: { createdAt: 'desc' },
        include: {
          moderator: { select: { id: true, username: true } },
        },
      },
    },
  })

  return {
    caseId: row.id,
    status: 'REVIEWING',
    updatedCase: updatedCase ? toPublicCase(updatedCase) : null,
  }
}

export async function createAppeal(userId, { moderationActionId, reason }) {
  const action = await prisma.moderationAction.findUnique({
    where: { id: Number(moderationActionId) },
  })
  if (!action || action.targetUserId !== Number(userId)) {
    throw Object.assign(new Error('No puedes apelar esta acción de moderación'), { statusCode: 403 })
  }

  const existing = await prisma.moderationAppeal.findFirst({
    where: {
      moderationActionId: action.id,
      userId: Number(userId),
      status: { in: ['PENDING', 'REVIEWING'] },
    },
  })

  if (existing) {
    throw Object.assign(new Error('Ya existe una apelación en curso para esta acción'), {
      statusCode: 409,
    })
  }

  const appeal = await prisma.moderationAppeal.create({
    data: {
      userId: Number(userId),
      moderationActionId: action.id,
      reason: String(reason).trim(),
    },
  })

  await prisma.moderationAuditLog.create({
    data: {
      actorId: Number(userId),
      actionId: action.id,
      eventType: 'APPEAL_CREATED',
      details: {
        appealId: appeal.id,
        moderationActionId: action.id,
      },
    },
  })

  return appeal
}

export async function listAppeals({ status, cursor, limit = 20 } = {}) {
  const take = Math.min(Math.max(Number(limit) || 20, 1), 50)
  const rows = await prisma.moderationAppeal.findMany({
    where: status ? { status } : {},
    take: take + 1,
    ...(cursor ? { cursor: { id: Number(cursor) }, skip: 1 } : {}),
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { id: true, username: true } },
      moderationAction: { select: { id: true, actionType: true, reason: true } },
      reviewer: { select: { id: true, username: true } },
    },
  })

  const hasMore = rows.length > take
  const items = hasMore ? rows.slice(0, take) : rows
  return { items, nextCursor: hasMore ? items.at(-1).id : null }
}

export async function reviewAppeal(appealId, reviewerId, { status, reviewerNotes }) {
  const appeal = await prisma.moderationAppeal.findUnique({
    where: { id: Number(appealId) },
  })
  if (!appeal) throw Object.assign(new Error('Apelación no encontrada'), { statusCode: 404 })
  if (appeal.status === 'APPROVED' || appeal.status === 'REJECTED') {
    throw Object.assign(new Error('La apelación ya fue cerrada'), { statusCode: 409 })
  }

  await prisma.$transaction(async (tx) => {
    await tx.moderationAppeal.update({
      where: { id: appeal.id },
      data: {
        status,
        reviewerId: Number(reviewerId),
        reviewerNotes: reviewerNotes || null,
        reviewedAt: new Date(),
      },
    })

    await writeAuditLog(tx, reviewerId, 'APPEAL_REVIEWED', {
      appealId: appeal.id,
      status,
      reviewerNotes: reviewerNotes || null,
    })
  })
}

export const __testables = {
  assertCanModerateTarget,
}
