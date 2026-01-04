
export type MaterialType = 'A' | 'B' | 'C';
export type LaunchMethod = '손당김' | '기계당김';

export interface ExperimentFactors {
  angle: boolean;
  tension: boolean;
  mass: boolean;
  rubberLength: boolean;
  friction: boolean;
  temp: boolean;
  humidity: boolean;
  wind: boolean;
  material: boolean;
  method: boolean;
}

export interface ExperimentConditions {
  angle: number;
  tension: number;
  mass: number;
  rubberLength: number;
  friction: number;
  temp: number;
  humidity: number;
  wind: number;
  material: MaterialType;
  method: LaunchMethod;
}

export interface ExperimentResult {
  id: number;
  conditions: Partial<ExperimentConditions>;
  yValues: number[];
  yBar: number;
  cost: number;
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}
