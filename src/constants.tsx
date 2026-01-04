
import { ExperimentFactors, ExperimentConditions } from './types';

export const INITIAL_FACTORS: ExperimentFactors = {
  angle: true,
  tension: true,
  mass: true,
  rubberLength: false,
  friction: false,
  temp: false,
  humidity: false,
  wind: false,
  material: true,
  method: true,
};

export const INITIAL_CONDITIONS: ExperimentConditions = {
  angle: 45,
  tension: 5,
  mass: 1,
  rubberLength: 30,
  friction: 0.2,
  temp: 25,
  humidity: 50,
  wind: 1.5,
  material: 'A',
  method: '손당김',
};

export const FACTOR_LABELS: Record<keyof ExperimentFactors, string> = {
  angle: '각도(°)',
  tension: '장력',
  mass: '질량(kg)',
  rubberLength: '고무줄 길이(cm)',
  friction: '마찰계수',
  temp: '온도(℃)',
  humidity: '습도(%)',
  wind: '바람세기(m/s)',
  material: '소재유형',
  method: '발사방법',
};

export const MAX_SIM_DISTANCE = 500;
export const BASE_COST = 100;
export const COST_PER_FACTOR = 20;
