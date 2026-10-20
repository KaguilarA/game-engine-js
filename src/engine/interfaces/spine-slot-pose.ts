export interface SpineSlotPose {
  name: string;
  boneIndex: number;
  attachmentName: string | null;
  color: string;
  darkColor?: string;
  blendMode: 'normal' | 'additive' | 'multiply' | 'screen';
}
