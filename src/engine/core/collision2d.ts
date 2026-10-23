import type { CollisionRect } from '../interfaces';
import type { CircleBody } from '../entities/circle-body';

/**
 * Allocation-free collision and bounce helpers for common 2D shapes.
 * @class Collision2D
 */
export default class {

  /**
   * Keeps a circular body inside horizontal world limits and reflects outward motion.
   * @public
   * @return {boolean}
   */
  public static resolveCircleAgainstHorizontalBounds(
    body: CircleBody,
    left: number,
    right: number,
    restitution = 0.6
  ): boolean {
    let collided = false;
    if (body.x - body.radius < left) {
      body.setPosition(left + body.radius, body.y);
      if (body.velocityX < 0) body.setVelocity(-body.velocityX * restitution, body.velocityY);
      collided = true;
    } else if (body.x + body.radius > right) {
      body.setPosition(right - body.radius, body.y);
      if (body.velocityX > 0) body.setVelocity(-body.velocityX * restitution, body.velocityY);
      collided = true;
    }
    return collided;
  }

  /**
   * Keeps a circular body inside vertical world limits and reflects outward motion.
   * @public
   * @return {boolean}
   */
  public static resolveCircleAgainstVerticalBounds(
    body: CircleBody,
    top: number,
    bottom: number,
    restitution = 0.6
  ): boolean {
    let collided = false;
    if (body.y - body.radius < top) {
      body.setPosition(body.x, top + body.radius);
      if (body.velocityY < 0) body.setVelocity(body.velocityX, -body.velocityY * restitution);
      collided = true;
    } else if (body.y + body.radius > bottom) {
      body.setPosition(body.x, bottom - body.radius);
      if (body.velocityY > 0) body.setVelocity(body.velocityX, -body.velocityY * restitution);
      collided = true;
    }
    return collided;
  }

  /**
   * Tests whether two circles overlap.
   * @public
   * @return {boolean}
   */
  public static overlapsCircles(
    x1: number,
    y1: number,
    radius1: number,
    x2: number,
    y2: number,
    radius2: number
  ): boolean {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const combinedRadius = radius1 + radius2;
    return dx * dx + dy * dy <= combinedRadius * combinedRadius;
  }

  /**
   * Tests whether a point lies within an axis-aligned rectangle.
   * @public
   * @return {boolean}
   */
  public static containsPoint(
    pointX: number,
    pointY: number,
    rectangleX: number,
    rectangleY: number,
    rectangleWidth: number,
    rectangleHeight: number
  ): boolean {
    return pointX >= rectangleX
      && pointX <= rectangleX + rectangleWidth
      && pointY >= rectangleY
      && pointY <= rectangleY + rectangleHeight;
  }

  /**
   * Tests two axis-aligned rectangles without allocating collision objects.
   * @public
   * @return {boolean}
   */
  public static overlapsRectangles(
    firstX: number,
    firstY: number,
    firstWidth: number,
    firstHeight: number,
    secondX: number,
    secondY: number,
    secondWidth: number,
    secondHeight: number
  ): boolean {
    return firstX < secondX + secondWidth
      && firstX + firstWidth > secondX
      && firstY < secondY + secondHeight
      && firstY + firstHeight > secondY;
  }

  /**
   * Calculates the minimum translation vector to separate a moving rectangle from target.
   * @public
   * @return {{ normalX: number; normalY: number; penetration: number } | null}
   */
  public static getAABBOverlap(
    moving: CollisionRect,
    target: CollisionRect
  ): { normalX: number; normalY: number; penetration: number } | null {
    const dx = (moving.x + moving.width * 0.5) - (target.x + target.width * 0.5);
    const halfWidths = (moving.width + target.width) * 0.5;
    const overlapX = halfWidths - Math.abs(dx);
    if (overlapX <= 0) return null;

    const dy = (moving.y + moving.height * 0.5) - (target.y + target.height * 0.5);
    const halfHeights = (moving.height + target.height) * 0.5;
    const overlapY = halfHeights - Math.abs(dy);
    if (overlapY <= 0) return null;

    if (overlapX < overlapY) {
      return {
        normalX: dx > 0 ? 1 : -1,
        normalY: 0,
        penetration: overlapX
      };
    } else {
      return {
        normalX: 0,
        normalY: dy > 0 ? 1 : -1,
        penetration: overlapY
      };
    }
  }

  /**
   * Resolves one-way platform landing for platformer games.
   * @public
   * @return {{ landed: boolean; resolvedY: number }}
   */
  public static resolveOneWayPlatform(
    actorX: number,
    actorY: number,
    actorWidth: number,
    actorHeight: number,
    previousY: number,
    velocityY: number,
    platform: CollisionRect
  ): { landed: boolean; resolvedY: number } {
    const wasAbove = previousY + actorHeight <= platform.y;
    const isNowAtOrBelow = actorY + actorHeight >= platform.y;
    const horizontalOverlap = actorX + actorWidth > platform.x && actorX < platform.x + platform.width;

    if (wasAbove && isNowAtOrBelow && velocityY >= 0 && horizontalOverlap) {
      return { landed: true, resolvedY: platform.y - actorHeight };
    }
    return { landed: false, resolvedY: actorY };
  }

  /** Tests a circle against an axis-aligned rectangle without resolving motion. */
  public static overlapsCircleAndRectangle(
    circleX: number,
    circleY: number,
    radius: number,
    rectangleX: number,
    rectangleY: number,
    rectangleWidth: number,
    rectangleHeight: number
  ): boolean {
    const closestX = Math.max(rectangleX, Math.min(circleX, rectangleX + rectangleWidth));
    const closestY = Math.max(rectangleY, Math.min(circleY, rectangleY + rectangleHeight));
    const distanceX = circleX - closestX;
    const distanceY = circleY - closestY;
    return distanceX * distanceX + distanceY * distanceY <= radius * radius;
  }

  public static resolveCircleAgainstCircle(
    body: CircleBody,
    x: number,
    y: number,
    radius: number,
    restitution = 0.82
  ): boolean {
    const dx = body.x - x;
    const dy = body.y - y;
    const minimumDistance = body.radius + radius;
    const distanceSquared = dx * dx + dy * dy;
    if (distanceSquared >= minimumDistance * minimumDistance) return false;
    const distance = Math.sqrt(distanceSquared);
    const nx = distance > 0 ? dx / distance : 0;
    const ny = distance > 0 ? dy / distance : -1;
    this.separateAndBounce(body, nx, ny, minimumDistance - distance, restitution);
    return true;
  }

  public static resolveCircleAgainstRect(
    body: CircleBody,
    rect: CollisionRect,
    restitution = 0.82
  ): boolean {
    const closestX = Math.max(rect.x, Math.min(body.x, rect.x + rect.width));
    const closestY = Math.max(rect.y, Math.min(body.y, rect.y + rect.height));
    let dx = body.x - closestX;
    let dy = body.y - closestY;
    const distanceSquared = dx * dx + dy * dy;
    if (distanceSquared >= body.radius * body.radius) return false;

    let distance = Math.sqrt(distanceSquared);
    let nx: number;
    let ny: number;
    if (distance > 0) {
      nx = dx / distance;
      ny = dy / distance;
    } else {
      const leftDistance = body.x - rect.x;
      const rightDistance = rect.x + rect.width - body.x;
      const topDistance = body.y - rect.y;
      const bottomDistance = rect.y + rect.height - body.y;
      let nearestDistance = leftDistance;
      nx = -1;
      ny = 0;
      if (rightDistance < nearestDistance) {
        nearestDistance = rightDistance;
        nx = 1;
      }
      if (topDistance < nearestDistance) {
        nearestDistance = topDistance;
        nx = 0;
        ny = -1;
      }
      if (bottomDistance < nearestDistance) {
        nearestDistance = bottomDistance;
        nx = 0;
        ny = 1;
      }
      distance = -nearestDistance;
    }
    this.separateAndBounce(body, nx, ny, body.radius - distance, restitution);
    return true;
  }

  public static resolveCircleAgainstSegment(
    body: CircleBody,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    thickness: number,
    restitution = 0.82
  ): boolean {
    const segmentX = endX - startX;
    const segmentY = endY - startY;
    const lengthSquared = segmentX * segmentX + segmentY * segmentY;
    const amount = lengthSquared > 0
      ? Math.max(0, Math.min(1, ((body.x - startX) * segmentX + (body.y - startY) * segmentY) / lengthSquared))
      : 0;
    const closestX = startX + segmentX * amount;
    const closestY = startY + segmentY * amount;
    const dx = body.x - closestX;
    const dy = body.y - closestY;
    const distance = Math.hypot(dx, dy);
    const combinedRadius = body.radius + thickness * 0.5;
    if (distance >= combinedRadius) return false;
    const nx = distance > 0 ? dx / distance : (segmentY === 0 ? 0 : -segmentY / Math.sqrt(lengthSquared));
    const ny = distance > 0 ? dy / distance : (segmentX === 0 ? -1 : segmentX / Math.sqrt(lengthSquared));
    this.separateAndBounce(body, nx, ny, combinedRadius - distance, restitution);
    return true;
  }

  private static separateAndBounce(
    body: CircleBody,
    normalX: number,
    normalY: number,
    penetration: number,
    restitution: number
  ): void {
    body.setPosition(body.x + normalX * penetration, body.y + normalY * penetration);
    const velocityAlongNormal = body.velocityX * normalX + body.velocityY * normalY;
    if (velocityAlongNormal >= 0) return;
    const impulse = (1 + Math.max(0, Math.min(1, restitution))) * velocityAlongNormal;
    body.setVelocity(
      body.velocityX - impulse * normalX,
      body.velocityY - impulse * normalY
    );
  }
}
