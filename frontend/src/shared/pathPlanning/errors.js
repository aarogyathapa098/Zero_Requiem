export class PathPlanningError extends Error {
  constructor(message, { code = 'path-planning-error', details = null, cause } = {}) {
    super(message, { cause })
    this.name = 'PathPlanningError'
    this.code = code
    this.details = details
  }
}
