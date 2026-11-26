import { ChevronDown, Compass, Layers, RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { floorplanConfig } from '../domain/floorplan';
import { useDeviceStore } from '../store/useDeviceStore';
import { useUiStore, type SelectedRoom } from '../store/useUiStore';
import { Icon } from './Icon';

interface RoomOption {
  id: SelectedRoom;
  label: string;
}

export function TopBar() {
  const deviceIds = useDeviceStore((s) => s.deviceIds);
  const devices = useDeviceStore((s) => s.devices);
  const providerMode = useDeviceStore((s) => s.providerMode);
  const lastError = useDeviceStore((s) => s.lastError);
  const resetSimulation = useDeviceStore((s) => s.resetSimulation);

  const activeRoom = useUiStore((s) => s.activeRoom);
  const setActiveRoom = useUiStore((s) => s.setActiveRoom);
  const closeInteraction = useUiStore((s) => s.closeInteraction);

  const [menuOpen, setMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const roomOptions = useMemo<RoomOption[]>(
    () => [
      { id: 'all', label: 'Visão Geral' },
      ...floorplanConfig.rooms.map((room) => ({ id: room.id, label: room.label })),
    ],
    [],
  );

  const onCount = useMemo(() => {
    let active = 0;
    for (const id of deviceIds) {
      if (devices[id]?.isOn) active += 1;
    }
    return active;
  }, [deviceIds, devices]);

  const activeLabel =
    roomOptions.find((option) => option.id === activeRoom)?.label ?? 'Visão Geral';

  useEffect(() => {
    if (!menuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  const handleSelectRoom = (roomId: SelectedRoom) => {
    setActiveRoom(roomId);
    if (roomId === 'all') {
      closeInteraction();
    }
    setMenuOpen(false);
  };

  return (
    <header className="hud-topbar">
      <div className="hud-topbar__left">
        <div className="hud-badge" aria-live="polite">
          <span className="hud-badge__dot" aria-hidden="true" />
          <Icon icon={Layers} size={15} />
          <span className="mono tabular">FINAL 02</span>
          {providerMode === 'mock' && (
            <span className="hud-badge__mode mono">· SIMULAÇÃO</span>
          )}
          <span className="mono tabular">
            · {onCount}/{deviceIds.length}
          </span>
          {lastError && <span className="hud-badge__error">· {lastError}</span>}
        </div>

        {import.meta.env.DEV && providerMode === 'mock' && (
          <button
            type="button"
            className="btn btn-tonal btn-icon"
            aria-label="Resetar simulação"
            title="Resetar simulação"
            onClick={() => void resetSimulation()}
          >
            <Icon icon={RotateCcw} size={15} />
          </button>
        )}
      </div>

      <nav className="hud-topbar__right" aria-label="Navegação por cômodos">
        <div className="room-strip">
          {roomOptions.map((room) => {
            const isActive = activeRoom === room.id;
            return (
              <button
                key={room.id}
                type="button"
                className={`btn room-strip__btn ${isActive ? 'btn-solid' : 'btn-tonal'}`}
                aria-pressed={isActive}
                onClick={() => handleSelectRoom(room.id)}
              >
                {room.id === 'all' && <Icon icon={Compass} size={15} />}
                <span>{room.label}</span>
              </button>
            );
          })}
        </div>

        <div className="room-dropdown" ref={dropdownRef}>
          <button
            type="button"
            className="btn btn-tonal room-dropdown__trigger"
            aria-expanded={menuOpen}
            aria-haspopup="listbox"
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            <Icon icon={Compass} size={15} />
            <span className="room-dropdown__label">{activeLabel}</span>
            <Icon icon={ChevronDown} size={14} />
          </button>

          {menuOpen && (
            <div className="panel panel-motion room-popover" role="listbox" aria-label="Selecionar cômodo">
              {roomOptions.map((room) => {
                const isActive = activeRoom === room.id;
                return (
                  <button
                    key={room.id}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    className={`btn room-popover__item ${isActive ? 'btn-solid' : 'btn-tonal'}`}
                    onClick={() => handleSelectRoom(room.id)}
                  >
                    <span>{room.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
