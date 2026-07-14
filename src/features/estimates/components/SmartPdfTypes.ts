export type OcrResult = {
  page: number;
  thumbnail: string;
  part_no: string;
  part_name: string;
  material: string;
  status: 'pending' | 'success' | 'fail';
  skip: boolean;
};

export type Mask = {
  page: number;
  x: number;
  y: number;
  w: number;
  h: number;
};
