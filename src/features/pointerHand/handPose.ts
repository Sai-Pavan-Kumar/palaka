// Where the parts sit in an image, as fractions of that image.
export type HandArt = {
  url: string
  aspect: number
  handTop: number
  tip: number
  tipX: number
  wrist: number
  rodX: number
  rodEnd: number
}

// Board fractions. The grip sits below the board and off to the right, so the
// stick leans in like someone holding it from outside the frame.
const HAND_LENGTH = 0.2
const GRIP_LEAN = 0.3
const GRIP_DEPTH = 0.12
const MIN_ROD = 0.05
const PRESS_SHRINK = 0.06

export type Size = { width: number; height: number }
export type Spot = { x: number; y: number }

export type HandPose = {
  rotation: number
  rodLength: number
  handLength: number
  imageWidth: number
  imageHeight: number
}

export function getGripTargetX(pointerX: number, board: Size): number {
  const leaned = pointerX + GRIP_LEAN * board.width
  return Math.min(Math.max(leaned, board.width * 0.15), board.width * 1.05)
}

export function getGripY(board: Size): number {
  return board.height * (1 + GRIP_DEPTH)
}

// Stretches the rod and turns the whole arm so the fingertip lands exactly on
// the pointer, whatever the distance to the grip.
export function getHandPose(
  pointer: Spot,
  grip: Spot,
  board: Size,
  pressAmount: number,
  art: HandArt,
): HandPose {
  const handLength =
    HAND_LENGTH * board.height * (1 - PRESS_SHRINK * pressAmount)
  const imageHeight = handLength / (art.wrist - art.handTop)
  const imageWidth = imageHeight * art.aspect
  const wristToTip = (art.wrist - art.tip) * imageHeight
  const tipOffset = (art.tipX - art.rodX) * imageWidth
  const dx = pointer.x - grip.x
  const dy = pointer.y - grip.y
  const reach = Math.hypot(dx, dy)
  const along = Math.sqrt(Math.max(0, reach * reach - tipOffset * tipOffset))
  const rodLength = Math.max(MIN_ROD * board.height, along - wristToTip)
  const tipAngle = Math.atan2(-(rodLength + wristToTip), tipOffset)
  return {
    rotation: Math.atan2(dy, dx) - tipAngle,
    rodLength,
    handLength,
    imageWidth,
    imageHeight,
  }
}

// CSS for the two slices of the same image: the hand as drawn, the rod stretched.
export function applyHandPose(
  arm: HTMLElement,
  hand: HTMLElement,
  rod: HTMLElement,
  grip: Spot,
  pose: HandPose,
  art: HandArt,
) {
  const { imageWidth, imageHeight, handLength, rodLength } = pose
  const left = `${-art.rodX * imageWidth}px`
  const rodImageHeight = rodLength / (art.rodEnd - art.wrist)
  arm.style.transform = `translate(${grip.x}px, ${grip.y}px) rotate(${pose.rotation}rad)`
  hand.style.cssText = `background-image:url(${art.url});left:${left};top:${-(rodLength + handLength)}px;width:${imageWidth}px;height:${handLength}px;background-size:${imageWidth}px ${imageHeight}px;background-position:0 ${-art.handTop * imageHeight}px`
  rod.style.cssText = `background-image:url(${art.url});left:${left};top:${-rodLength}px;width:${imageWidth}px;height:${rodLength}px;background-size:${imageWidth}px ${rodImageHeight}px;background-position:0 ${-art.wrist * rodImageHeight}px`
}
