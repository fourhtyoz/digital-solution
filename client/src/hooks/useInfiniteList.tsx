import { useState, useEffect, useRef } from "react";
import { PAGE_SIZE } from "../utils/constants";
import type { Item } from "../types";

export default function useInfiniteList(url: string, filter: string) {
    const [items, setItems] = useState<Item[]>([]);
    const [offset, setOffset] = useState(0);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);

    const abortControllerRef = useRef<AbortController | null>(null);

    const load = async (reset = false) => {
        if (loading) return;

        setLoading(true);

        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        const controller = new AbortController();
        abortControllerRef.current = controller;

        const currentOffset = reset ? 0 : offset;

        try {
            const res = await fetch(
                `${url}?offset=${currentOffset}&limit=${PAGE_SIZE}&filter=${filter}`,
                { signal: controller.signal },
            );

            const data = await res.json();
            setItems((prev) => (reset ? data.items : [...prev, ...data.items]));
            setOffset(currentOffset + PAGE_SIZE);
            setTotal(data.total);
        } catch (err: any) {
            if (err.name === "AbortError") {
                console.log("Previous fetch aborted");
            } else {
                console.error(err);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setOffset(0);
        load(true);

        return () => {
            abortControllerRef.current?.abort();
        };
    }, [filter, url]);

    return { items, setItems, load, total };
}
