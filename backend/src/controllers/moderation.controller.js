import {
  applyModerationAction,
  createAppeal,
  createReport,
  getReportCaseById,
  getReports,
  getUserModerationHistory,
  listAppeals,
  reviewAppeal,
  toggleRelation,
  updateModerationCaseStatus,
} from '../services/moderation.service.js'

export async function reportHandler(request, reply) {
  const report = await createReport(request.userId, request.body)
  return reply.code(201).send({ report })
}

export async function blockHandler(request) {
  return {
    blocked: await toggleRelation(
      'userBlock',
      'blockerId',
      'blockedId',
      request.userId,
      Number(request.params.id),
    ),
  }
}

export async function muteHandler(request) {
  return {
    muted: await toggleRelation(
      'userMute',
      'muterId',
      'mutedId',
      request.userId,
      Number(request.params.id),
    ),
  }
}

export async function reportsHandler(request) {
  return getReports(request.query ?? {})
}

export async function reportCaseDetailHandler(request) {
  const item = await getReportCaseById(request.params.id)
  return { item }
}

export async function updateReportCaseStatusHandler(request) {
  await updateModerationCaseStatus(request.params.id, request.body.status, request.userId)
  return { success: true }
}

export async function reportActionHandler(request) {
  const result = await applyModerationAction(request.params.id, request.moderator, request.body)
  return { success: true, ...result }
}

export async function userModerationHistoryHandler(request) {
  const history = await getUserModerationHistory(request.params.id)
  return { history }
}

export async function createAppealHandler(request, reply) {
  const appeal = await createAppeal(request.userId, request.body)
  return reply.code(201).send({ appeal })
}

export async function listAppealsHandler(request) {
  return listAppeals(request.query ?? {})
}

export async function reviewAppealHandler(request) {
  await reviewAppeal(request.params.id, request.userId, request.body)
  return { success: true }
}
