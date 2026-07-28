import { createReport, getReports, resolveReport, toggleRelation } from '../services/moderation.service.js'
export async function reportHandler(request, reply) { return reply.code(201).send({ report: await createReport(request.userId, request.body) }) }
export async function blockHandler(request) { return { blocked: await toggleRelation('userBlock', 'blockerId', 'blockedId', request.userId, Number(request.params.id)) } }
export async function muteHandler(request) { return { muted: await toggleRelation('userMute', 'muterId', 'mutedId', request.userId, Number(request.params.id)) } }
export async function reportsHandler(request) { return getReports(request.query ?? {}) }
export async function resolveReportHandler(request) { await resolveReport(request.params.id, request.body); return { success: true } }
