/**
 * Rounded table values used by every model of the chapter.
 * RHO0: density of saturated water vapour, g/m³ (over ice below 0 °C), from the Sonntag (1990) vapour-pressure
 * formulas and the ideal-gas law, rounded to 0.1 g/m³.
 * PSY: psychrometric table, relative humidity in % for a dry-bulb temperature (rows) and the difference
 * dry − wet (columns 0…10 °C); ventilated psychrometer, psychrometer coefficient 6.62e-4 1/°C, 101.3 kPa.
 */
export const T_MIN = -10;
export const RHO0: number[] = [2.1, 2.3, 2.5, 2.8, 3.0, 3.2, 3.5, 3.8, 4.1, 4.5, 4.8, 5.2, 5.6, 5.9, 6.4, 6.8, 7.3, 7.7, 8.3, 8.8, 9.4, 10.0, 10.7, 11.3, 12.1, 12.8, 13.6, 14.5, 15.4, 16.3, 17.3, 18.3, 19.4, 20.6, 21.8, 23.0, 24.4, 25.8, 27.2, 28.7, 30.4];
export const PSY_ROWS: number[] = [6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30];
export const PSY: (number | null)[][] = [[100, 86, 73, 60, 47, 34, 22, null, null, null, null], [100, 87, 75, 63, 51, 39, 28, 17, 7, null, null], [100, 88, 76, 65, 54, 44, 33, 23, 14, 4, null], [100, 89, 78, 68, 57, 48, 38, 29, 20, 11, 3], [100, 89, 79, 70, 60, 51, 42, 33, 25, 17, 9], [100, 90, 81, 71, 62, 54, 45, 37, 29, 22, 15], [100, 91, 82, 73, 64, 56, 48, 41, 33, 26, 19], [100, 91, 83, 74, 66, 59, 51, 44, 37, 30, 24], [100, 92, 83, 75, 68, 61, 54, 47, 40, 34, 28], [100, 92, 84, 77, 69, 62, 56, 49, 43, 37, 31], [100, 92, 85, 78, 71, 64, 58, 51, 45, 40, 34], [100, 93, 85, 78, 72, 65, 59, 53, 48, 42, 37], [100, 93, 86, 79, 73, 67, 61, 55, 50, 44, 39]];
