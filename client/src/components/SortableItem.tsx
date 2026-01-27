import type { Item } from "../types";
import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";

interface Props {
    item: Item;
    onRemove: (id: string) => void;
}

export default function SortableItem({ item, onRemove }: Props) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: item.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            className={`flex items-center justify-between px-3 py-2 border-b border-slate-300 bg-white ${
                isDragging ? "opacity-60" : ""
            }`}
        >
            {/* Drag handle */}
            <div
                {...listeners}
                className="flex-1 cursor-grab text-sm text-gray-800"
            >
                {item.id}
            </div>

            {/* Remove button */}
            <button
                onClick={() => onRemove(item.id)}
                className="ml-3 text-red-500 hover:text-red-700 text-sm cursor-pointer"
            >
                ✕
            </button>
        </div>
    );
}
