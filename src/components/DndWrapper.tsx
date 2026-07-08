import React from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';

interface DraggableProps {
  id: string;
  data: {
    type: 'grid-cell' | 'pool-lesson';
    hour?: string;
    colKey?: string;
    slotIdx?: number;
    cellData?: any;
  };
  children: React.ReactNode;
  disabled?: boolean;
  key?: React.Key;
}

export function DraggableItem({ id, data, children, disabled }: DraggableProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    data,
    disabled
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 1000,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`relative touch-none select-none ${disabled ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'} ${isDragging ? 'opacity-40 scale-95 shadow-md border-dashed' : ''}`}
    >
      {children}
    </div>
  );
}

interface DroppableProps {
  id: string; // "hour|colKey" nebo "hour|colKey|slotIdx"
  data: {
    hour: string;
    colKey: string;
    isSport?: boolean;
    slotIdx?: number;
  };
  children: React.ReactNode;
}

export function DroppableCell({ id, data, children }: DroppableProps) {
  const { isOver, setNodeRef } = useDroppable({
    id,
    data
  });

  return (
    <div
      ref={setNodeRef}
      className={`h-full w-full transition-all duration-200 rounded-md ${
        isOver ? 'bg-indigo-100/70 border-2 border-indigo-400 ring-2 ring-indigo-200 ring-offset-1' : ''
      }`}
    >
      {children}
    </div>
  );
}
