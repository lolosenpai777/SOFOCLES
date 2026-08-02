import test from 'node:test'
import assert from 'node:assert/strict'
import { prisma } from '../src/config/prisma.js'
import { buildApp } from '../src/app.js'
import { applyModerationAction, revokeUserSanction, __testables } from '../src/services/moderation.service.js'

function patchPrisma(handlers) {
  const originals = {}

  for (const key of Object.keys(handlers)) {
    const [modelName, methodName] = key.split('.')
    originals[key] = prisma[modelName][methodName]
    prisma[modelName][methodName] = handlers[key]
  }

  return () => {
    for (const key of Object.keys(originals)) {
      const [modelName, methodName] = key.split('.')
      prisma[modelName][methodName] = originals[key]
    }
  }
}

function buildModerationCaseStub({
  caseId = 10,
  status = 'REVIEWING',
  postId = 30,
  targetUserId = 200,
} = {}) {
  return {
    id: caseId,
    status,
    post: {
      id: postId,
      title: 'Post de prueba',
      authorId: targetUserId,
      hiddenAt: null,
    },
    reports: [{ id: 700 }],
  }
}

function setupActionEndpointHarness({
  moderatorUser,
  targetUser,
  moderationCase = buildModerationCaseStub({ targetUserId: targetUser.id }),
  warningsCount = 1,
}) {
  const state = {
    actionTypes: [],
    actionCreates: [],
    postUpdates: [],
    warningCreates: [],
    suspensionCreates: [],
    reportStatusUpdates: [],
    caseStatusUpdates: [],
    auditEvents: [],
    auditLogCreates: [],
    transactionCalls: 0,
  }

  const originalTransaction = prisma.$transaction
  prisma.$transaction = async (callback) => {
    state.transactionCalls += 1
    const tx = {
      moderationAction: {
        create: async (args) => {
          state.actionCreates.push(args)
          state.actionTypes.push(args.data.actionType)
          return {
            id: 1000 + state.actionTypes.length,
            actionType: args.data.actionType,
            reason: args.data.reason,
            durationHours: args.data.durationHours ?? null,
            createdAt: new Date(),
            moderator: { id: moderatorUser.id, username: moderatorUser.username },
          }
        },
      },
      userWarning: {
        create: async (args) => {
          state.warningCreates.push(args)
          return { id: 4000 }
        },
        count: async () => warningsCount,
      },
      userSuspension: {
        create: async (args) => {
          state.suspensionCreates.push(args)
          return {
            id: 5000 + state.suspensionCreates.length,
            endAt: args.data.endAt ?? null,
            type: args.data.type,
          }
        },
      },
      post: {
        update: async (args) => {
          state.postUpdates.push(args)
          return { id: args.where.id, hiddenAt: args.data.hiddenAt }
        },
      },
      report: {
        updateMany: async (args) => {
          state.reportStatusUpdates.push(args.data.status)
          return { count: 1 }
        },
      },
      moderationCase: {
        update: async (args) => {
          state.caseStatusUpdates.push(args.data.status)
          return { id: args.where.id, status: args.data.status }
        },
        findUnique: async () => ({
          id: moderationCase.id,
          postId: moderationCase.post.id,
          status: state.caseStatusUpdates.at(-1) ?? 'RESOLVED',
          priorityScore: 70,
          reportsCount: 2,
          distinctReportersCount: 2,
          lastReportedAt: new Date(),
          autoHiddenAt: null,
          post: {
            id: moderationCase.post.id,
            title: moderationCase.post.title,
            content: 'Contenido del post reportado',
            imageUrl: null,
            hiddenAt: state.postUpdates.at(-1)?.data?.hiddenAt ?? null,
            createdAt: new Date(),
            author: {
              id: targetUser.id,
              username: targetUser.username,
              avatarUrl: null,
            },
          },
          reports: [
            {
              id: moderationCase.reports[0].id,
              reason: 'SPAM',
              details: 'detalle',
              createdAt: new Date(),
              reporter: { id: 333, username: 'reporter', avatarUrl: null },
            },
          ],
          actions: state.actionTypes.length
            ? [
              {
                id: 9999,
                actionType: state.actionTypes.at(-1),
                reason: 'Motivo de prueba',
                createdAt: new Date(),
                moderator: { id: moderatorUser.id, username: moderatorUser.username },
              },
            ]
            : [],
        }),
      },
      moderationAuditLog: {
        create: async (args) => {
          state.auditEvents.push(args.data.eventType)
          state.auditLogCreates.push(args.data)
          return { id: 6000 }
        },
      },
    }

    return callback(tx)
  }

  const restorePrisma = patchPrisma({
    'user.findUnique': async (args) => {
      const id = Number(args?.where?.id)
      if (id === Number(moderatorUser.id)) return moderatorUser
      if (id === Number(targetUser.id)) return targetUser
      return null
    },
    'userSuspension.findMany': async () => [],
    'moderationCase.findUnique': async (args) => {
      if (Number(args?.where?.id) !== Number(moderationCase.id)) return null
      return moderationCase
    },
    'notification.create': async () => ({ id: 777 }),
  })

  return {
    state,
    restore: () => {
      restorePrisma()
      prisma.$transaction = originalTransaction
    },
  }
}

test('GET /api/admin/users/sanctions devuelve 401 sin auth', async () => {
  const app = buildApp()
  const response = await app.inject({
    method: 'GET',
    url: '/api/admin/users/sanctions',
  })
  assert.equal(response.statusCode, 401)
  await app.close()
})

test('GET /api/admin/users/sanctions devuelve 403 si el rol no es moderador', async () => {
  const app = buildApp()
  await app.ready()

  const restore = patchPrisma({
    'user.findUnique': async () => ({
      id: 99,
      role: 'USER',
      moderationRole: 'NONE',
    }),
    'userSuspension.findMany': async () => [],
  })

  try {
    const token = app.jwt.sign({
      sub: 99,
      username: 'normal-user',
      email: 'normal@example.com',
      role: 'USER',
      moderationRole: 'NONE',
    })

    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/users/sanctions',
      headers: { authorization: `Bearer ${token}` },
    })
    assert.equal(response.statusCode, 403)
  } finally {
    restore()
    await app.close()
  }
})

test('POST /api/admin/users/:id/sanctions/:suspensionId/revoke devuelve 403 para moderador junior', async () => {
  const app = buildApp()
  await app.ready()

  const restore = patchPrisma({
    'user.findUnique': async () => ({
      id: 101,
      role: 'USER',
      moderationRole: 'JUNIOR',
    }),
    'userSuspension.findMany': async () => [],
  })

  try {
    const token = app.jwt.sign({
      sub: 101,
      username: 'junior-mod',
      email: 'junior@example.com',
      role: 'USER',
      moderationRole: 'JUNIOR',
    })

    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/users/200/sanctions/300/revoke',
      headers: { authorization: `Bearer ${token}` },
      payload: { reason: 'Revisión de caso' },
    })
    assert.equal(response.statusCode, 403)
  } finally {
    restore()
    await app.close()
  }
})

test('POST /api/admin/reports/:id/reopen devuelve 403 para moderador junior', async () => {
  const app = buildApp()
  await app.ready()

  const restore = patchPrisma({
    'user.findUnique': async () => ({
      id: 120,
      role: 'USER',
      moderationRole: 'JUNIOR',
    }),
    'userSuspension.findMany': async () => [],
  })

  try {
    const token = app.jwt.sign({
      sub: 120,
      username: 'junior-mod',
      email: 'junior-reopen@example.com',
      role: 'USER',
      moderationRole: 'JUNIOR',
    })

    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/reports/10/reopen',
      headers: { authorization: `Bearer ${token}` },
      payload: { reason: 'Reabrir para revisión adicional' },
    })

    assert.equal(response.statusCode, 403)
  } finally {
    restore()
    await app.close()
  }
})

test('POST /api/admin/reports/:id/reopen devuelve 409 si el caso ya está en REVIEWING', async () => {
  const app = buildApp()
  await app.ready()

  const restore = patchPrisma({
    'user.findUnique': async () => ({
      id: 121,
      role: 'ADMIN',
      moderationRole: 'ADMIN',
    }),
    'userSuspension.findMany': async () => [],
    'moderationCase.findUnique': async (args) => {
      if (args?.where?.id !== 10) return null
      return {
        id: 10,
        status: 'REVIEWING',
        post: {
          id: 30,
          title: 'Post de prueba',
          authorId: 200,
          hiddenAt: null,
          author: { id: 200, username: 'target-user' },
        },
        actions: [],
      }
    },
  })

  try {
    const token = app.jwt.sign({
      sub: 121,
      username: 'admin-mod',
      email: 'admin-reopen@example.com',
      role: 'ADMIN',
      moderationRole: 'ADMIN',
    })

    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/reports/10/reopen',
      headers: { authorization: `Bearer ${token}` },
      payload: { reason: 'Revisión adicional solicitada' },
    })

    assert.equal(response.statusCode, 409)
  } finally {
    restore()
    await app.close()
  }
})

test('POST /api/admin/reports/:id/reopen reabre caso RESOLVED y escribe CASE_REOPENED', async () => {
  const app = buildApp()
  await app.ready()

  let moderationCaseFindCount = 0
  let updatedCaseStatus = null
  let updatedReportsStatus = null
  let auditEventType = null

  const originalTransaction = prisma.$transaction
  prisma.$transaction = async (callback) => callback({
    moderationCase: {
      update: async (args) => {
        updatedCaseStatus = args?.data?.status
        return { id: args?.where?.id, status: args?.data?.status }
      },
    },
    report: {
      updateMany: async (args) => {
        updatedReportsStatus = args?.data?.status
        return { count: 2 }
      },
    },
    moderationAuditLog: {
      create: async (args) => {
        auditEventType = args?.data?.eventType
        return { id: 777 }
      },
    },
  })

  const restore = patchPrisma({
    'user.findUnique': async () => ({
      id: 122,
      role: 'ADMIN',
      moderationRole: 'ADMIN',
    }),
    'userSuspension.findMany': async () => [],
    'moderationCase.findUnique': async (args) => {
      if (args?.where?.id !== 10) return null
      moderationCaseFindCount += 1
      if (moderationCaseFindCount === 1) {
        return {
          id: 10,
          status: 'RESOLVED',
          post: {
            id: 30,
            title: 'Post de prueba',
            authorId: 200,
            hiddenAt: null,
            author: { id: 200, username: 'target-user' },
          },
          actions: [
            {
              id: 99,
              actionType: 'ISSUE_WARNING',
              reason: 'Motivo original',
              createdAt: new Date(),
              moderator: { id: 122, username: 'admin-mod' },
            },
          ],
        }
      }
      return {
        id: 10,
        status: 'REVIEWING',
        priorityScore: 10,
        reportsCount: 2,
        distinctReportersCount: 2,
        lastReportedAt: new Date(),
        autoHiddenAt: null,
        postId: 30,
        post: {
          id: 30,
          title: 'Post de prueba',
          authorId: 200,
          hiddenAt: null,
          author: { id: 200, username: 'target-user' },
        },
        actions: [
          {
            id: 100,
            actionType: 'ISSUE_WARNING',
            reason: 'Motivo original',
            createdAt: new Date(),
            moderator: { id: 122, username: 'admin-mod' },
          },
        ],
      }
    },
  })

  try {
    const token = app.jwt.sign({
      sub: 122,
      username: 'admin-mod',
      email: 'admin-reopen-success@example.com',
      role: 'ADMIN',
      moderationRole: 'ADMIN',
    })

    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/reports/10/reopen',
      headers: { authorization: `Bearer ${token}` },
      payload: { reason: 'Reabrir por nueva evidencia' },
    })

    assert.equal(response.statusCode, 200)
    const body = response.json()
    assert.equal(body.success, true)
    assert.equal(body.status, 'REVIEWING')
    assert.equal(body.updatedCase.status, 'REVIEWING')
    assert.equal(updatedCaseStatus, 'REVIEWING')
    assert.equal(updatedReportsStatus, 'REVIEWING')
    assert.equal(auditEventType, 'CASE_REOPENED')
  } finally {
    restore()
    prisma.$transaction = originalTransaction
    await app.close()
  }
})

test('POST /api/admin/reports/:id/actions rechaza dismiss combinado con otras decisiones', async () => {
  const app = buildApp()
  await app.ready()

  const restore = patchPrisma({
    'user.findUnique': async () => ({
      id: 130,
      role: 'ADMIN',
      moderationRole: 'ADMIN',
      username: 'admin-mod',
    }),
    'userSuspension.findMany': async () => [],
  })

  try {
    const token = app.jwt.sign({
      sub: 130,
      username: 'admin-mod',
      email: 'admin-actions@example.com',
      role: 'ADMIN',
      moderationRole: 'ADMIN',
    })

    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/reports/10/actions',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        dismiss: true,
        contentAction: 'DELETE_POST',
        reason: 'No corresponde',
      },
    })

    assert.equal(response.statusCode, 400)
    assert.match(response.json().error, /Descartar no se combina/i)
  } finally {
    restore()
    await app.close()
  }
})

test('POST /api/admin/reports/:id/actions rechaza SUSPEND_TEMPORARY sin durationHours', async () => {
  const app = buildApp()
  await app.ready()

  const restore = patchPrisma({
    'user.findUnique': async () => ({
      id: 131,
      role: 'ADMIN',
      moderationRole: 'ADMIN',
      username: 'admin-mod',
    }),
    'userSuspension.findMany': async () => [],
  })

  try {
    const token = app.jwt.sign({
      sub: 131,
      username: 'admin-mod',
      email: 'admin-actions-2@example.com',
      role: 'ADMIN',
      moderationRole: 'ADMIN',
    })

    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/reports/10/actions',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        dismiss: false,
        sanctionAction: 'SUSPEND_TEMPORARY',
        reason: 'Suspensión temporal sin duración',
      },
    })

    assert.equal(response.statusCode, 400)
    assert.match(response.json().error, /duración en horas/i)
  } finally {
    restore()
    await app.close()
  }
})

test('POST /api/admin/reports/:id/actions combina DELETE_POST + ISSUE_WARNING y resuelve caso', async () => {
  const app = buildApp()
  await app.ready()

  const moderatorUser = { id: 132, role: 'ADMIN', moderationRole: 'ADMIN', username: 'admin-mod' }
  const targetUser = { id: 200, role: 'USER', moderationRole: 'NONE', username: 'target-user' }
  const harness = setupActionEndpointHarness({ moderatorUser, targetUser })

  try {
    const token = app.jwt.sign({
      sub: moderatorUser.id,
      username: moderatorUser.username,
      email: 'combo-warning@example.com',
      role: moderatorUser.role,
      moderationRole: moderatorUser.moderationRole,
    })

    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/reports/10/actions',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        dismiss: false,
        contentAction: 'DELETE_POST',
        sanctionAction: 'ISSUE_WARNING',
        reason: 'Contenido infringe normas y requiere advertencia',
      },
    })

    assert.equal(response.statusCode, 200)
    const body = response.json()
    assert.equal(body.success, true)
    assert.equal(body.nextCaseStatus, 'RESOLVED')
    assert.equal(body.updatedCase.status, 'RESOLVED')
    assert.deepEqual(
      body.createdActions.map((item) => item.actionType),
      ['DELETE_POST', 'ISSUE_WARNING'],
    )
    assert.equal(body.createdActions.length, 2)
    assert.ok(body.warningResult?.actionId)
    assert.equal(body.warningResult?.warningsCount, 1)
    assert.equal(body.suspension, null)
    assert.equal(harness.state.actionCreates.length, 2)
    assert.equal(harness.state.postUpdates.length, 1)
    assert.equal(harness.state.warningCreates.length, 1)
    assert.deepEqual(harness.state.actionTypes, ['DELETE_POST', 'ISSUE_WARNING'])
    assert.equal(harness.state.caseStatusUpdates.at(-1), 'RESOLVED')
    assert.equal(harness.state.auditEvents.filter((eventType) => eventType === 'MODERATION_ACTION_APPLIED').length, 2)
    assert.deepEqual(
      harness.state.auditLogCreates
        .filter((entry) => entry.eventType === 'MODERATION_ACTION_APPLIED')
        .map((entry) => entry.details?.actionType)
        .sort(),
      ['DELETE_POST', 'ISSUE_WARNING'],
    )
  } finally {
    harness.restore()
    await app.close()
  }
})

test('POST /api/admin/reports/:id/actions combina DELETE_POST + SUSPEND_PERMANENT y resuelve caso', async () => {
  const app = buildApp()
  await app.ready()

  const moderatorUser = { id: 133, role: 'ADMIN', moderationRole: 'ADMIN', username: 'admin-mod' }
  const targetUser = { id: 201, role: 'USER', moderationRole: 'NONE', username: 'target-user' }
  const harness = setupActionEndpointHarness({ moderatorUser, targetUser })

  try {
    const token = app.jwt.sign({
      sub: moderatorUser.id,
      username: moderatorUser.username,
      email: 'combo-permanent@example.com',
      role: moderatorUser.role,
      moderationRole: moderatorUser.moderationRole,
    })

    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/reports/10/actions',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        dismiss: false,
        contentAction: 'DELETE_POST',
        sanctionAction: 'SUSPEND_PERMANENT',
        reason: 'Contenido grave y usuario reincidente',
      },
    })

    assert.equal(response.statusCode, 200)
    const body = response.json()
    assert.equal(body.success, true)
    assert.equal(body.nextCaseStatus, 'RESOLVED')
    assert.equal(body.updatedCase.status, 'RESOLVED')
    assert.equal(body.createdActions.length, 2)
    assert.deepEqual(
      body.createdActions.map((item) => item.actionType),
      ['DELETE_POST', 'SUSPEND_PERMANENT'],
    )
    assert.equal(body.suspension?.type, 'PERMANENT')
    assert.equal(harness.state.actionCreates.length, 2)
    assert.equal(harness.state.postUpdates.length, 1)
    assert.equal(harness.state.suspensionCreates.length, 1)
    assert.deepEqual(harness.state.actionTypes, ['DELETE_POST', 'SUSPEND_PERMANENT'])
    assert.equal(harness.state.caseStatusUpdates.at(-1), 'RESOLVED')
  } finally {
    harness.restore()
    await app.close()
  }
})

test('applyModerationAction mantiene paridad para cada acción individual', async () => {
  const baseCase = buildModerationCaseStub({ caseId: 10, status: 'REVIEWING', targetUserId: 300 })
  const moderator = { id: 140, role: 'ADMIN', moderationRole: 'ADMIN', username: 'admin-mod' }
  const targetUser = { id: 300, role: 'USER', moderationRole: 'NONE', username: 'target-user' }

  const scenarios = [
    {
      label: 'DELETE_POST',
      payload: { dismiss: false, contentAction: 'DELETE_POST', sanctionAction: null, reason: 'Eliminar contenido' },
      expectedStatus: 'RESOLVED',
      expectedActions: ['DELETE_POST'],
      expectPostHidden: true,
      expectWarning: false,
      expectSuspensionType: null,
    },
    {
      label: 'ISSUE_WARNING',
      payload: { dismiss: false, contentAction: null, sanctionAction: 'ISSUE_WARNING', reason: 'Advertencia formal' },
      expectedStatus: 'RESOLVED',
      expectedActions: ['ISSUE_WARNING'],
      expectPostHidden: false,
      expectWarning: true,
      expectSuspensionType: null,
    },
    {
      label: 'SUSPEND_TEMPORARY',
      payload: { dismiss: false, contentAction: null, sanctionAction: 'SUSPEND_TEMPORARY', durationHours: 24, reason: 'Suspensión temporal' },
      expectedStatus: 'RESOLVED',
      expectedActions: ['SUSPEND_TEMPORARY'],
      expectPostHidden: false,
      expectWarning: false,
      expectSuspensionType: 'TEMPORARY',
    },
    {
      label: 'SUSPEND_PERMANENT',
      payload: { dismiss: false, contentAction: null, sanctionAction: 'SUSPEND_PERMANENT', reason: 'Ban definitivo' },
      expectedStatus: 'RESOLVED',
      expectedActions: ['SUSPEND_PERMANENT'],
      expectPostHidden: false,
      expectWarning: false,
      expectSuspensionType: 'PERMANENT',
    },
    {
      label: 'DISMISS_REPORT',
      payload: { dismiss: true, contentAction: null, sanctionAction: null, reason: 'No hay infracción' },
      expectedStatus: 'DISMISSED',
      expectedActions: ['DISMISS_REPORT'],
      expectPostHidden: false,
      expectWarning: false,
      expectSuspensionType: null,
    },
  ]

  for (const scenario of scenarios) {
    const state = {
      actionTypes: [],
      postUpdates: [],
      warningCreates: 0,
      suspensionCreates: [],
      reportStatuses: [],
      caseStatuses: [],
    }

    const originalTransaction = prisma.$transaction
    prisma.$transaction = async (callback) => callback({
      moderationAction: {
        create: async (args) => {
          state.actionTypes.push(args.data.actionType)
          return {
            id: 2000 + state.actionTypes.length,
            actionType: args.data.actionType,
            reason: args.data.reason,
            durationHours: args.data.durationHours ?? null,
            createdAt: new Date(),
            moderator: { id: moderator.id, username: moderator.username },
          }
        },
      },
      userWarning: {
        create: async () => {
          state.warningCreates += 1
          return { id: 1 }
        },
        count: async () => 1,
      },
      userSuspension: {
        create: async (args) => {
          state.suspensionCreates.push(args.data.type)
          return { id: 1, type: args.data.type, endAt: args.data.endAt ?? null }
        },
      },
      post: {
        update: async (args) => {
          state.postUpdates.push(args)
          return { id: args.where.id, hiddenAt: args.data.hiddenAt }
        },
      },
      report: {
        updateMany: async (args) => {
          state.reportStatuses.push(args.data.status)
          return { count: 1 }
        },
      },
      moderationCase: {
        update: async (args) => {
          state.caseStatuses.push(args.data.status)
          return { id: args.where.id, status: args.data.status }
        },
        findUnique: async () => ({
          id: baseCase.id,
          postId: baseCase.post.id,
          status: state.caseStatuses.at(-1) ?? scenario.expectedStatus,
          priorityScore: 10,
          reportsCount: 1,
          distinctReportersCount: 1,
          lastReportedAt: new Date(),
          autoHiddenAt: null,
          post: {
            id: baseCase.post.id,
            title: baseCase.post.title,
            content: 'Contenido',
            imageUrl: null,
            hiddenAt: state.postUpdates.length > 0 ? new Date() : null,
            createdAt: new Date(),
            author: { id: targetUser.id, username: targetUser.username, avatarUrl: null },
          },
          reports: [
            {
              id: 700,
              reason: 'SPAM',
              details: null,
              createdAt: new Date(),
              reporter: { id: 51, username: 'reporter', avatarUrl: null },
            },
          ],
          actions: [
            {
              id: 4444,
              actionType: state.actionTypes.at(-1) ?? scenario.expectedActions[0],
              reason: scenario.payload.reason,
              createdAt: new Date(),
              moderator: { id: moderator.id, username: moderator.username },
            },
          ],
        }),
      },
      moderationAuditLog: {
        create: async () => ({ id: 1 }),
      },
    })

    const restore = patchPrisma({
      'moderationCase.findUnique': async () => baseCase,
      'user.findUnique': async (args) => {
        const id = Number(args?.where?.id)
        if (id === moderator.id) return moderator
        if (id === targetUser.id) return targetUser
        return null
      },
      'notification.create': async () => ({ id: 99 }),
    })

    try {
      const result = await applyModerationAction(baseCase.id, moderator, scenario.payload)
      assert.equal(result.nextCaseStatus, scenario.expectedStatus, scenario.label)
      assert.deepEqual(result.createdActions.map((item) => item.actionType), scenario.expectedActions, scenario.label)
      assert.equal(state.postUpdates.length > 0, scenario.expectPostHidden, scenario.label)
      assert.equal(state.warningCreates > 0, scenario.expectWarning, scenario.label)
      if (scenario.expectSuspensionType) {
        assert.equal(state.suspensionCreates[0], scenario.expectSuspensionType, scenario.label)
      } else {
        assert.equal(state.suspensionCreates.length, 0, scenario.label)
      }
      assert.equal(state.reportStatuses.at(-1), scenario.expectedStatus, scenario.label)
      assert.equal(state.caseStatuses.at(-1), scenario.expectedStatus, scenario.label)
    } finally {
      restore()
      prisma.$transaction = originalTransaction
    }
  }
})

test('applyModerationAction falla completo si moderador junior combina DELETE_POST + SUSPEND_PERMANENT', async () => {
  const moderationCase = buildModerationCaseStub({ caseId: 22, status: 'REVIEWING', targetUserId: 400 })
  const moderator = { id: 150, role: 'USER', moderationRole: 'JUNIOR', username: 'junior-mod' }
  const state = {
    postUpdates: [],
    actionCreates: [],
    caseUpdates: [],
    reportUpdates: [],
  }

  let transactionCalls = 0
  const originalTransaction = prisma.$transaction
  prisma.$transaction = async (callback) => {
    transactionCalls += 1
    return callback({
      post: {
        update: async (args) => {
          state.postUpdates.push(args)
          return { id: args.where.id, hiddenAt: args.data.hiddenAt }
        },
      },
      moderationAction: {
        create: async (args) => {
          state.actionCreates.push(args)
          return { id: 9001 }
        },
      },
      moderationCase: {
        update: async (args) => {
          state.caseUpdates.push(args)
          return { id: args.where.id, status: args.data.status }
        },
      },
      report: {
        updateMany: async (args) => {
          state.reportUpdates.push(args)
          return { count: 1 }
        },
      },
      moderationAuditLog: {
        create: async () => ({ id: 1 }),
      },
      userSuspension: {
        create: async () => ({ id: 1 }),
      },
      userWarning: {
        create: async () => ({ id: 1 }),
        count: async () => 1,
      },
    })
  }

  const restore = patchPrisma({
    'moderationCase.findUnique': async () => moderationCase,
    'user.findUnique': async () => ({ id: 400, role: 'USER', moderationRole: 'NONE', username: 'target-user' }),
  })

  try {
    await assert.rejects(
      () =>
        applyModerationAction(22, moderator, {
          dismiss: false,
          contentAction: 'DELETE_POST',
          sanctionAction: 'SUSPEND_PERMANENT',
          reason: 'Intento de combinación sin permiso',
        }),
      (error) =>
        error?.statusCode === 403 &&
        /no permite aplicar suspensiones/i.test(error.message),
    )
    assert.equal(transactionCalls, 0)
    assert.equal(state.postUpdates.length, 0)
    assert.equal(state.actionCreates.length, 0)
    assert.equal(state.caseUpdates.length, 0)
    assert.equal(state.reportUpdates.length, 0)
    const persistedCase = await prisma.moderationCase.findUnique({ where: { id: 22 } })
    assert.equal(persistedCase.status, 'REVIEWING')
    assert.equal(persistedCase.post.hiddenAt, null)
  } finally {
    restore()
    prisma.$transaction = originalTransaction
  }
})

test('assertCanModerateTarget lanza error si moderator.id === targetUser.id', async () => {
  assert.throws(
    () => __testables.assertCanModerateTarget(
      { id: 44, role: 'ADMIN', moderationRole: 'ADMIN' },
      { id: 44, role: 'USER', moderationRole: 'NONE' },
    ),
    (error) => error?.statusCode === 403 && error.message.includes('propia cuenta'),
  )
})

test('assertCanModerateTarget lanza error si el target tiene rol admin', async () => {
  assert.throws(
    () => __testables.assertCanModerateTarget(
      { id: 11, role: 'ADMIN', moderationRole: 'ADMIN' },
      { id: 55, role: 'ADMIN', moderationRole: 'NONE' },
    ),
    (error) => error?.statusCode === 403 && error.message.includes('administrador'),
  )
})

test('revokeUserSanction marca active=false y escribe SANCTION_REVOKED en auditoría', async () => {
  let updatedSuspensionArgs = null
  let createdAuditLogArgs = null
  let createdNotificationArgs = null

  const originalTransaction = prisma.$transaction
  prisma.$transaction = async (callback) => callback({
    userSuspension: {
      update: async (args) => {
        updatedSuspensionArgs = args
        return { id: args.where.id, active: false }
      },
    },
    moderationAuditLog: {
      create: async (args) => {
        createdAuditLogArgs = args
        return { id: 1 }
      },
    },
  })

  const restore = patchPrisma({
    'userSuspension.findFirst': async () => ({
      id: 300,
      userId: 200,
      type: 'PERMANENT',
      endAt: null,
      user: {
        id: 200,
        username: 'target-user',
        role: 'USER',
        moderationRole: 'NONE',
      },
    }),
    'notification.create': async (args) => {
      createdNotificationArgs = args
      return { id: 99 }
    },
  })

  try {
    const result = await revokeUserSanction({
      targetUserId: 200,
      suspensionId: 300,
      moderator: { id: 1, role: 'ADMIN', moderationRole: 'ADMIN' },
      reason: 'Revocación de prueba',
    })

    assert.equal(result.suspensionId, 300)
    assert.equal(result.userId, 200)
    assert.equal(updatedSuspensionArgs.where.id, 300)
    assert.equal(updatedSuspensionArgs.data.active, false)
    assert.ok(updatedSuspensionArgs.data.endAt instanceof Date)
    assert.equal(createdAuditLogArgs.data.eventType, 'SANCTION_REVOKED')
    assert.equal(createdAuditLogArgs.data.details.suspensionId, 300)
    assert.equal(createdAuditLogArgs.data.details.targetUserId, 200)
    assert.equal(createdNotificationArgs.data.userId, 200)
  } finally {
    restore()
    prisma.$transaction = originalTransaction
  }
})
