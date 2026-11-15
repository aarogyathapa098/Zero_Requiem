// Errors raised by the shared Mars grid loader.
//
// Callers can catch `MarsGridError` for every failure that comes from this
// module, then inspect the concrete subclass when they need to react
// differently (for example, show a "grid data missing" notice instead of a
// generic failure).

export class MarsGridError extends Error {
  constructor(message, options) {
    super(message, options)
    this.name = 'MarsGridError'
  }
}

/** The raster/legend files are missing or unreadable. */
export class MarsGridDataError extends MarsGridError {
  constructor(message, options) {
    super(message, options)
    this.name = 'MarsGridDataError'
  }
}

/** A cell or window falls outside the grid. */
export class MarsGridRangeError extends MarsGridError {
  constructor(message, options) {
    super(message, options)
    this.name = 'MarsGridRangeError'
  }
}

/** A layer does not share the authoritative elevation grid. */
export class MarsGridAlignmentError extends MarsGridError {
  constructor(message, options) {
    super(message, options)
    this.name = 'MarsGridAlignmentError'
  }
}
