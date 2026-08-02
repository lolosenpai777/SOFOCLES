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
}) {
  const action = await tx.moderationAction.create({
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

export async function getReports({ cursor, limit = 20, status }) {
  const take = Math.min(Math.max(Number(limit) || 20, 1), 50)
  const where = status ? { status } : {}
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

  const targetUserId = moderationCase.post.authorId
  const actionType = payload.actionType
  assertActionPermission(moderator, actionType)

  const execution = await prisma.$transaction(async (tx) => {
    const action = await tx.moderationAction.create({
      data: {
        actionType,
        reason: payload.reason,
        durationHours: payload.durationHours ?? null,
        moderatorId: Number(moderator.id),
        caseId: moderationCase.id,
        reportId: moderationCase.reports[0]?.id ?? null,
        targetUserId,
        targetPostId: moderationCase.post.id,
      },
    })

    let nextCaseStatus = 'REVIEWING'
    let warningResult = null
    let suspension = null

    if (actionType === 'DISMISS_REPORT') {
      nextCaseStatus = 'DISMISSED'
      await tx.report.updateMany({
        where: { caseId: moderationCase.id },
        data: { status: 'DISMISSED', reviewedAt: new Date() },
      })
    }

    if (actionType === 'DELETE_POST') {
      nextCaseStatus = 'RESOLVED'
      await tx.post.update({
        where: { id: moderationCase.post.id },
        data: { hiddenAt: new Date() },
      })
      await tx.report.updateMany({
        where: { caseId: moderationCase.id },
        data: { status: 'RESOLVED', reviewedAt: new Date() },
      })
    }

    if (actionType === 'ISSUE_WARNING') {
      nextCaseStatus = 'RESOLVED'
      warningResult = await createWarningWithEscalation(tx, {
        moderatorId: Number(moderator.id),
        moderationCaseId: moderationCase.id,
        targetUserId,
        reason: payload.reason,
        reportId: moderationCase.reports[0]?.id ?? null,
        targetPostId: moderationCase.post.id,
      })
      await tx.report.updateMany({
        where: { caseId: moderationCase.id },
        data: { status: 'RESOLVED', reviewedAt: new Date() },
      })
    }

    if (actionType === 'SUSPEND_TEMPORARY') {
      nextCaseStatus = 'RESOLVED'
      const endAt = new Date(Date.now() + Number(payload.durationHours) * 60 * 60 * 1000)
      suspension = await tx.userSuspension.create({
        data: {
          userId: targetUserId,
          moderationActionId: action.id,
          type: 'TEMPORARY',
          scope: 'ACCOUNT',
          startAt: new Date(),
          endAt,
          reason: payload.reason,
        },
      })
      await tx.report.updateMany({
        where: { caseId: moderationCase.id },
        data: { status: 'RESOLVED', reviewedAt: new Date() },
      })
    }

    if (actionType === 'SUSPEND_PERMANENT') {
      nextCaseStatus = 'RESOLVED'
      suspension = await tx.userSuspension.create({
        data: {
          userId: targetUserId,
          moderationActionId: action.id,
          type: 'PERMANENT',
          scope: 'ACCOUNT',
          startAt: new Date(),
          endAt: null,
          reason: payload.reason,
        },
      })
      await tx.report.updateMany({
        where: { caseId: moderationCase.id },
        data: { status: 'RESOLVED', reviewedAt: new Date() },
      })
    }

    await tx.moderationCase.update({
      where: { id: moderationCase.id },
      data: { status: nextCaseStatus },
    })

    await writeAuditLog(
      tx,
      Number(moderator.id),
      'MODERATION_ACTION_APPLIED',
      {
        caseId: moderationCase.id,
        postId: moderationCase.post.id,
        targetUserId,
        actionType,
        reason: payload.reason,
        durationHours: payload.durationHours ?? null,
      },
      action.id,
    )

    return { action, warningResult, suspension, nextCaseStatus }
  })

  if (execution.action.actionType === 'ISSUE_WARNING') {
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

  if (execution.action.actionType === 'SUSPEND_TEMPORARY' && execution.suspension?.endAt) {
    await notifyUserModerationEvent(
      targetUserId,
      `Tu cuenta fue suspendida hasta ${new Date(execution.suspension.endAt).toISOString()}. Motivo: ${payload.reason}`,
      Number(moderator.id),
    )
  }

  if (execution.action.actionType === 'SUSPEND_PERMANENT') {
    await notifyUserModerationEvent(
      targetUserId,
      `Tu cuenta fue suspendida permanentemente. Motivo: ${payload.reason}`,
      Number(moderator.id),
    )
  }

  if (execution.action.actionType === 'DELETE_POST') {
    await notifyUserModerationEvent(
      targetUserId,
      `Una de tus publicaciones fue retirada por moderación. Motivo: ${payload.reason}`,
      Number(moderator.id),
    )
  }

  return execution
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
