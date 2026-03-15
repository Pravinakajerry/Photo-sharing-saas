import { useState, useEffect, RefObject, useRef } from "react";

interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}

export function useLassoSelection(
    containerRef: RefObject<HTMLElement | null>,
    externalSelectedIds?: Set<string>,
    setExternalSelectedIds?: (value: Set<string> | ((prev: Set<string>) => Set<string>)) => void
) {
    const [internalSelectedIds, setInternalSelectedIds] = useState<Set<string>>(new Set());
    const selectedIds = externalSelectedIds ?? internalSelectedIds;
    const setSelectedIds = setExternalSelectedIds ?? setInternalSelectedIds;

    const selectedIdsRef = useRef<Set<string>>(selectedIds);
    const [selectionBox, setSelectionBox] = useState<Rect | null>(null);

    // Keep ref in sync without adding to effect dependencies
    useEffect(() => {
        selectedIdsRef.current = selectedIds;
    }, [selectedIds]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        let startX = 0;
        let startY = 0;
        let isDragging = false;
        let initialSelectedIds: Set<string> = new Set();
        let isMultiSelect = false;

        const handleMouseDown = (e: MouseEvent) => {
            // Only left click
            if (e.button !== 0) return;

            const target = e.target as HTMLElement;

            // Ignore if clicking on interactive elements like inputs, buttons, links
            if (
                target.closest('button') ||
                target.closest('a') ||
                target.closest('input') ||
                target.closest('textarea') ||
                target.closest('select')
            ) {
                return;
            }

            const selectableItem = target.closest('[data-selectable-id]');

            isMultiSelect = e.shiftKey || e.metaKey || e.ctrlKey;

            if (selectableItem) {
                const id = selectableItem.getAttribute('data-selectable-id');
                // Selection Mode Persistence: If we have items selected, we want clicks to toggle.
                // We let the native click events proceed so DashboardTabs can handle them.
                if (id && selectedIdsRef.current.has(id) && !isMultiSelect && selectedIdsRef.current.size === 0) {
                    return;
                }
            } else {
                // Only prevent default for background clicks to start lasso
                e.preventDefault();
            }

            const rect = container.getBoundingClientRect();
            // Store mouse start within the container if we want absolute, 
            // but it's easier to use clientX / clientY for viewport-fixed lasso
            startX = e.clientX;
            startY = e.clientY;
            isDragging = true;

            const isStickySelection = selectedIdsRef.current.size > 0;
            initialSelectedIds = (isMultiSelect || isStickySelection) ? new Set(selectedIdsRef.current) : new Set();
            
            if (!isMultiSelect && !isStickySelection) {
                setSelectedIds(new Set());
            }

            setSelectionBox({
                x: startX,
                y: startY,
                width: 0,
                height: 0
            });
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;

            const currentX = e.clientX;
            const currentY = e.clientY;

            const box = {
                x: Math.min(startX, currentX),
                y: Math.min(startY, currentY),
                width: Math.abs(currentX - startX),
                height: Math.abs(currentY - startY)
            };

            setSelectionBox(box);

            // only calculate intersection if we've moved a bit to avoid tiny clicks
            if (box.width > 3 || box.height > 3) {
                calculateIntersections(box, initialSelectedIds, isMultiSelect);
            }
        };

        const handleMouseUp = (e: MouseEvent) => {
            if (!isDragging) return;
            isDragging = false;
            setSelectionBox(null);

            // If it was just a click without dragging
            if (Math.abs(e.clientX - startX) <= 3 && Math.abs(e.clientY - startY) <= 3) {
                const target = e.target as HTMLElement;
                const selectableItem = target.closest('[data-selectable-id]');

                if (!selectableItem && !isMultiSelect) {
                    // Clicked on background without multi-select modifier
                    setSelectedIds(new Set());
                }
            }
        };

        const calculateIntersections = (box: Rect, initialIds: Set<string>, multi: boolean) => {
            if (!container) return;

            const items = container.querySelectorAll('[data-selectable-id]');
            const newSelected = new Set(multi ? initialIds : []);

            items.forEach(item => {
                const rect = item.getBoundingClientRect();
                const id = item.getAttribute('data-selectable-id');
                if (!id) return;

                // Check intersection between box and item rect
                const isIntersecting = !(
                    rect.right < box.x ||
                    rect.left > box.x + box.width ||
                    rect.bottom < box.y ||
                    rect.top > box.y + box.height
                );

                if (isIntersecting) {
                    newSelected.add(id);
                } else if (!multi || !initialIds.has(id)) {
                    newSelected.delete(id);
                }
            });

            setSelectedIds(newSelected);
        };

        container.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            container.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [containerRef]);

    return {
        selectedIds,
        setSelectedIds,
        selectionBox
    };
}
