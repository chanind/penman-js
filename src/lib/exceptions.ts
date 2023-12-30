/**
 * Base class for errors in the Penman package
 * @noInheritDoc
 */
export class PenmanError extends Error {}

/**
 * Raised when working with invalid constant values
 * @noInheritDoc
 */
export class ConstantError extends PenmanError {}

/**
 * Raised on invalid graph structures or operations
 * @noInheritDoc
 */
export class GraphError extends PenmanError {}

/**
 * Raised on invalid graph layouts
 * @noInheritDoc
 */
export class LayoutError extends PenmanError {}

/**
 * Raised on PENMAN syntax errors
 * @noInheritDoc
 */
export class DecodeError extends PenmanError {
  message: string;
  filename: string;
  lineno: number;
  offset: number;
  text: string;

  constructor(
    message: string = null,
    filename: string = null,
    lineno: number = null,
    offset: number = null,
    text: string = null,
  ) {
    super(message);
    this.message = message;
    this.filename = filename;
    this.lineno = lineno;
    this.offset = offset;
    this.text = text;
  }

  toString(): string {
    let parts: string[] = [];
    if (this.filename != null) {
      parts.push(`File "${this.filename}"`);
    }
    if (this.lineno != null) {
      parts.push(`line ${this.lineno}`);
    }
    if (parts.length > 0) {
      parts = ['', '  ' + parts.join(', ')];
    }
    if (this.text != null) {
      parts.push('    ' + this.text);
      if (this.offset != null) {
        parts.push('    ' + ' '.repeat(this.offset) + '^');
      }
    } else if (parts.length > 0) {
      parts[parts.length - 1] += `, character ${this.offset}`;
    }
    if (this.message != null) {
      parts.push(`${this.constructor.name}: ${this.message}`);
    }
    return parts.join('\n');
  }
}

/**
 * Raised on invalid surface information
 * @noInheritDoc
 */
export class SurfaceError extends PenmanError {}

/**
 * Raised when a graph violates model constraints.
 * @noInheritDoc
 */
export class ModelError extends PenmanError {}
