import Dimensions from '../core/dimensions';
import { Component } from './component';

export interface TransformOptions {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  scaleX?: number;
  scaleY?: number;
  pivotX?: number;
  pivotY?: number;
}

/** Position, size, scale and pivot data shared by an Entity's components. */
export class TransformComponent extends Component {
  public readonly dimensions: Dimensions;

  public constructor(options: TransformOptions = {}) {
    super();
    this.dimensions = new Dimensions(
      options.width ?? 0,
      options.height ?? 0,
      options.x ?? 0,
      options.y ?? 0,
      options.pivotX ?? 0,
      options.pivotY ?? 0
    );
    this.dimensions.setScale(options.scaleX ?? 1, options.scaleY ?? options.scaleX ?? 1);
  }
}
