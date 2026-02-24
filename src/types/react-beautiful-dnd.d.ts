declare module 'react-beautiful-dnd' {
  export interface DraggableProvided {
    innerRef: (element: HTMLElement | null) => void;
    draggableProps: Record<string, unknown>;
    dragHandleProps: Record<string, unknown> | null;
  }
  export interface DraggableStateSnapshot {
    isDragging: boolean;
  }
  export interface DroppableProvided {
    innerRef: (element: HTMLElement | null) => void;
    droppableProps: Record<string, unknown>;
    placeholder: React.ReactNode;
  }
  export interface DroppableStateSnapshot {
    isDraggingOver: boolean;
  }
  export interface DropResult {
    draggableId: string;
    type: string;
    source: { index: number; droppableId: string };
    destination: { index: number; droppableId: string } | null;
  }
  export function DragDropContext(props: { onDragEnd: (result: DropResult) => void; children: React.ReactNode }): JSX.Element;
  export function Droppable(props: { droppableId: string; children: (provided: DroppableProvided, snapshot: DroppableStateSnapshot) => React.ReactElement }): JSX.Element;
  export function Draggable(props: { draggableId: string; index: number; children: (provided: DraggableProvided, snapshot: DraggableStateSnapshot) => React.ReactElement }): JSX.Element;
}
