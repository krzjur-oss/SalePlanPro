import { describe, it, expect } from 'vitest';
import { getDemoAppState } from '../utils';
import { 
  AppStateSchema, 
  SegmentRoomSchema, 
  SegmentSchema, 
  FloorSchema, 
  BuildingSchema,
  SpecialStudentSchema
} from './validationSchemas';

describe('ValidationSchemas - SegmentRoomSchema & AppStateSchema Integrity', () => {
  it('stan wygenerowany przez domyślną funkcję getDemoAppState() musi przejść AppStateSchema.safeParse', () => {
    const demoState = getDemoAppState();
    
    // Upewnij się, że demo state faktycznie zawiera strukturę pięter i segmentów z pokojami { id, num, sub }
    expect(demoState.floors.length).toBeGreaterThan(0);
    expect(demoState.floors[0].segments.length).toBeGreaterThan(0);
    expect(demoState.floors[0].segments[0].rooms.length).toBeGreaterThan(0);
    const sampleRoom = demoState.floors[0].segments[0].rooms[0];
    expect(sampleRoom).toHaveProperty('num');
    expect(sampleRoom).not.toHaveProperty('name');

    const result = AppStateSchema.safeParse(demoState);
    if (!result.success) {
      console.error('Validation errors for demo state:', result.error.issues);
    }
    expect(result.success).toBe(true);
  });

  it('stan z pokojami w segmentach bez pola "name" NIE jest odrzucany', () => {
    const stateWithRoomsWithoutName = {
      ...getDemoAppState(),
      floors: [
        {
          id: 'f1',
          name: 'Parter',
          color: '#3b82f6',
          buildingIdx: 0,
          segments: [
            {
              id: 'seg1',
              name: 'Skrzydło Zachodnie',
              rooms: [
                { id: 'rm_101', num: '101' },
                { id: 'rm_102', num: '102', sub: 'Pracownia' }
              ]
            }
          ]
        }
      ]
    };

    const parseResult = AppStateSchema.safeParse(stateWithRoomsWithoutName);
    expect(parseResult.success).toBe(true);
    if (parseResult.success) {
      const parsedFloor = parseResult.data.floors?.[0];
      expect(parsedFloor?.segments?.[0]?.rooms?.[0]?.num).toBe('101');
      expect(parsedFloor?.segments?.[0]?.rooms?.[1]?.sub).toBe('Pracownia');
    }
  });

  it('SegmentRoomSchema mapuje pole "name" na "num" gdy w starszych danych występuje tylko "name"', () => {
    const legacyRoom = {
      id: 'legacy_1',
      name: '204',
      sub: 'Językowa'
    };

    const result = SegmentRoomSchema.safeParse(legacyRoom);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.num).toBe('204');
      expect(result.data.id).toBe('legacy_1');
      expect(result.data.sub).toBe('Językowa');
    }
  });

  it('SegmentRoomSchema akceptuje numeryczne "num" i rzutuje je na string', () => {
    const numericRoom = {
      id: 'num_room',
      num: 305
    };

    const result = SegmentRoomSchema.safeParse(numericRoom);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.num).toBe('305');
      expect(typeof result.data.num).toBe('string');
    }
  });

  it('FloorSchema i BuildingSchema pasują do typów Floor i Building z types.ts', () => {
    const building = {
      id: 'b1',
      name: 'Budynek Sportowy',
      address: 'ul. Sportowa 5',
      multi: true,
      singleClassLimit: true,
      hasCustomStructure: true,
      customFloors: ['f1', 'f2'],
      customSegments: ['s1']
    };

    const buildingResult = BuildingSchema.safeParse(building);
    expect(buildingResult.success).toBe(true);
    if (buildingResult.success) {
      expect(buildingResult.data.address).toBe('ul. Sportowa 5');
      expect(buildingResult.data.singleClassLimit).toBe(true);
    }

    const floor = {
      id: 'f1',
      name: 'I Piętro',
      color: '#10b981',
      buildingIdx: 0,
      segments: [
        {
          id: 's1',
          name: 'Segment Główny',
          rooms: [{ id: 'r1', num: '101' }]
        }
      ]
    };

    const floorResult = FloorSchema.safeParse(floor);
    expect(floorResult.success).toBe(true);
    if (floorResult.success) {
      expect(floorResult.data.color).toBe('#10b981');
      expect(floorResult.data.buildingIdx).toBe(0);
    }
  });

  it('obsługuje pole homeTeachingInSchool w SpecialStudentSchema oraz AppStateSchema', () => {
    const studentWithSchool = {
      id: 'stud_1',
      firstName: 'Adam',
      lastName: 'Nowak',
      type: 'ni',
      supportTypes: ['ni'],
      supportHours: { ni: 10 },
      homeTeachingInSchool: true
    };

    const studentWithHome = {
      id: 'stud_2',
      firstName: 'Kacper',
      lastName: 'Kowalski',
      type: 'ni',
      supportTypes: ['ni'],
      supportHours: { ni: 8 },
      homeTeachingInSchool: false
    };

    const parsed1 = SpecialStudentSchema.safeParse(studentWithSchool);
    expect(parsed1.success).toBe(true);
    if (parsed1.success) {
      expect(parsed1.data.homeTeachingInSchool).toBe(true);
    }

    const parsed2 = SpecialStudentSchema.safeParse(studentWithHome);
    expect(parsed2.success).toBe(true);
    if (parsed2.success) {
      expect(parsed2.data.homeTeachingInSchool).toBe(false);
    }

    // Sprawdź także w pełnym AppState
    const demo = getDemoAppState();
    demo.planLekcji.specialStudents = [parsed1.data as any, parsed2.data as any];
    const appResult = AppStateSchema.safeParse(demo);
    expect(appResult.success).toBe(true);
  });
});
