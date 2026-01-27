import { useRef, useState } from "react";
import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import {
    SortableContext,
    verticalListSortingStrategy,
    arrayMove,
} from "@dnd-kit/sortable";
import { API } from "./utils/constants";
import useDebouncedValue from "./hooks/useDebounceValue";
import useInfiniteList from "./hooks/useInfiniteList";
import ScrollContainer from "./components/ScrollContainer";
import SortableItem from "./components/SortableItem";

export default function App() {
    const [filterLeft, setFilterLeft] = useState("");
    const [filterRight, setFilterRight] = useState("");

    const debouncedFilterLeft = useDebouncedValue(filterLeft, 300);
    const debouncedFilterRight = useDebouncedValue(filterRight, 300);

    const left = useInfiniteList(`${API}/items`, debouncedFilterLeft);
    const right = useInfiniteList(`${API}/selected`, debouncedFilterRight);

    const sensors = useSensors(useSensor(PointerSensor));

    const [newItemId, setNewItemId] = useState("");
    const [newItemText, setNewItemText] = useState("");

    const addNewItem = async () => {
        const id = parseInt(newItemId);
        if (!id || left.items.some((i) => i.id === id.toString())) return;

        left.setItems((prev) => [
            ...prev,
            { id: id.toString(), text: newItemText },
        ]);

        // Call backend
        try {
            const res = await fetch(`${API}/items`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, text: newItemText }),
            });
            if (!res.ok) {
                throw new Error("Ошибка при добавлении сущности");
            }
        } catch (err) {
            console.error(err);
            left.setItems((prev) => prev.filter((i) => i.id !== id.toString()));
        }

        setNewItemId("");
        setNewItemText("");
    };

    const add = async (id: string) => {
        const prevLeft = left.items;
        const prevRight = right.items;

        left.setItems((items) => items.filter((i) => i.id !== id));
        right.setItems((items) => [...items, { id }]);

        try {
            const res = await fetch(`${API}/selected`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id }),
            });

            if (!res.ok) throw new Error("add failed");
        } catch (err) {
            left.setItems(prevLeft);
            right.setItems(prevRight);
            console.error(err);
        }
    };

    const remove = async (id: string) => {
        const prevLeft = left.items;
        const prevRight = right.items;

        right.setItems((items) => items.filter((i) => i.id !== id));
        left.setItems((items) =>
            [...items, { id }].sort((a, b) => Number(a.id) - Number(b.id)),
        );

        try {
            const res = await fetch(`${API}/selected/${id}`, {
                method: "DELETE",
            });

            if (!res.ok) throw new Error("remove failed");
        } catch (err) {
            left.setItems(prevLeft);
            right.setItems(prevRight);
            console.error(err);
        }
    };

    const reorderTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    const onDragEnd = (event: any) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = right.items.findIndex((i) => i.id === active.id);
        const newIndex = right.items.findIndex((i) => i.id === over.id);

        const newOrder = arrayMove(right.items, oldIndex, newIndex);
        right.setItems(newOrder);

        if (reorderTimeout.current) {
            clearTimeout(reorderTimeout.current);
        }

        reorderTimeout.current = setTimeout(async () => {
            await fetch(`${API}/selected/order`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ order: newOrder.map((i) => i.id) }),
            });
        }, 1000);
    };

    return (
        <div className="min-h-screen bg-linear-to-br from-slate-100 to-slate-200 p-8">
            <h1 className="text-2xl font-bold text-slate-800 mb-6 text-center">
                Тестовое задание на позицию Fullstack от Цифровые решения
            </h1>
            <div className="max-w-6xl mx-auto grid grid-cols-2 gap-8">
                <div className="bg-white rounded-2xl shadow-lg p-5 flex flex-col">
                    <h3 className="font-semibold text-slate-700 mb-3">
                        Все сущности
                    </h3>
                    <input
                        className="mb-4 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        placeholder="Фильтрация по ID"
                        value={filterLeft}
                        onChange={(e) => setFilterLeft(e.target.value)}
                    />
                    <ScrollContainer onScrollEnd={() => left.load()}>
                        {filterLeft !== debouncedFilterLeft && (
                            <p className="m-3 text-xs text-slate-400 ">
                                Идет фильтрация…
                            </p>
                        )}
                        {left.items.length === 0 && (
                            <p className="m-3 text-xs text-slate-400 ">
                                Нет данных
                            </p>
                        )}
                        {left.items.map((i) => (
                            <div
                                key={i.id}
                                className="px-3 py-2 border-b border-slate-300 text-sm cursor-pointer transition-colors hover:bg-blue-50 hover:text-blue-700"
                                onClick={() => add(i.id)}
                            >
                                {i.id}
                            </div>
                        ))}
                    </ScrollContainer>
                    <p className="mb-3 mt-3 text-xs text-slate-400">
                        Нажмите на сущности, чтобы выбрать ее →
                    </p>
                    <h3 className="font-semibold text-slate-700 mb-3">
                        Добавить сущность
                    </h3>
                    <div className="flex gap-2 mb-4">
                        <input
                            type="number"
                            placeholder="ID (только числа)"
                            value={newItemId}
                            onChange={(e) => setNewItemId(e.target.value)}
                            className="flex-1 px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                        <button
                            onClick={addNewItem}
                            disabled={newItemId === ""}
                            className="px-4 py-2 rounded text-white 
             bg-blue-500 hover:bg-blue-600 
             disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
                        >
                            Добавить в общий список
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg p-5 flex flex-col">
                    <h3 className="font-semibold text-slate-700 mb-3">
                        Выбранные сущности
                    </h3>
                    <input
                        className="mb-4 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                        placeholder="Фильтрация по ID"
                        value={filterRight}
                        onChange={(e) => setFilterRight(e.target.value)}
                    />

                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={onDragEnd}
                    >
                        <SortableContext
                            items={right.items.map((i) => i.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <ScrollContainer onScrollEnd={() => right.load()}>
                                {filterRight !== debouncedFilterRight && (
                                    <p className="m-3 text-xs text-slate-400">
                                        Идет фильтрация…
                                    </p>
                                )}
                                {right.items.length === 0 && (
                                    <p className="m-3 text-xs text-slate-400 ">
                                        Нет данных
                                    </p>
                                )}

                                {right.items.map((item) => (
                                    <SortableItem
                                        key={item.id}
                                        item={item}
                                        onRemove={remove}
                                    />
                                ))}
                            </ScrollContainer>
                        </SortableContext>
                    </DndContext>
                    <p className="mt-3 text-xs text-slate-400">
                        Перетащите элемент на нужную позицию · ✕ - удалить
                    </p>
                </div>
            </div>
        </div>
    );
}
