/**
 * Positions measured from the start of a span, beginning at startOffset and
 * stepping by spacing until endOffset from the far end is reached.
 *
 * @return list of offsets in metres from the span start
 */
export function spacedOffsetsAlongSpan(
    totalLength: number,
    startOffset: number,
    endOffset: number,
    spacing: number,
): number[] {
    const maxOffset = totalLength - endOffset;

    if (maxOffset < startOffset - 1e-9 || spacing <= 0) {
        return [];
    }

    const offsets: number[] = [];
    let position = startOffset;

    while (position <= maxOffset + 1e-9) {
        offsets.push(position);
        position += spacing;
    }

    return offsets;
}
