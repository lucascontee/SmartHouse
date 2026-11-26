import { create } from 'zustand';
import type { RoomId } from '../domain/types';

export type SelectedRoom = 'all' | RoomId;
export type InteractionLevel = 'none' | 'quick' | 'detail';

export interface UiStoreState {
  activeRoom: SelectedRoom;
  selectedDeviceId: string | null;
  interactionLevel: InteractionLevel;
  setActiveRoom: (room: SelectedRoom) => void;
  openQuickCard: (deviceId: string) => void;
  openDetailDrawer: (deviceId?: string) => void;
  backToQuickCard: () => void;
  closeInteraction: () => void;
}

export const useUiStore = create<UiStoreState>((set) => ({
  activeRoom: 'all',
  selectedDeviceId: null,
  interactionLevel: 'none',

  setActiveRoom(room) {
    set({ activeRoom: room });
  },

  openQuickCard(deviceId) {
    set({
      selectedDeviceId: deviceId,
      interactionLevel: 'quick',
    });
  },

  openDetailDrawer(deviceId) {
    set((state) => ({
      selectedDeviceId: deviceId ?? state.selectedDeviceId,
      interactionLevel: (deviceId ?? state.selectedDeviceId) ? 'detail' : 'none',
    }));
  },

  backToQuickCard() {
    set((state) => ({
      interactionLevel: state.selectedDeviceId ? 'quick' : 'none',
    }));
  },

  closeInteraction() {
    set({
      selectedDeviceId: null,
      interactionLevel: 'none',
    });
  },
}));
