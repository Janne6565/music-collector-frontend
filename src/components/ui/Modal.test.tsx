import { Modal, ModalClose } from "@/components/ui";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

/**
 * Closing a sheet is now two steps — play the exit, then tell the caller — and the caller
 * is what unmounts it. Every dismissal has to reach that second step, or a sheet closes
 * visually and stays in the DOM.
 */
beforeAll(() => {
  // jsdom knows the <dialog> element but not the top layer.
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close() {
    this.open = false;
  };
});

function open(onClose: () => void, holdOnBackdrop = false) {
  return render(
    <Modal onClose={onClose} labelledBy="t" width="400px" holdOnBackdrop={holdOnBackdrop}>
      <h2 id="t">A sheet</h2>
      <ModalClose onClose={onClose} label="Close" />
    </Modal>,
  );
}

describe("Modal", () => {
  it("waits for the exit before handing over to the caller", () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    open(onClose);

    fireEvent.click(screen.getByLabelText("Close"));
    // Still there: the element has to survive its own 120ms exit.
    expect(onClose).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(120));
    expect(onClose).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("closes the same way on Escape — nothing is faster", () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    const { container } = open(onClose);

    fireEvent(container.querySelector("dialog") as HTMLDialogElement, new Event("cancel"));
    act(() => vi.advanceTimersByTime(120));

    expect(onClose).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("only hands over once, however many times it is dismissed", () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    open(onClose);

    fireEvent.click(screen.getByLabelText("Close"));
    fireEvent.click(screen.getByLabelText("Close"));
    act(() => vi.advanceTimersByTime(240));

    expect(onClose).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("refuses a backdrop click while the sheet holds unsaved edits", () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    const { container } = open(onClose, true);
    const backdrop = container.querySelector("dialog > div") as HTMLElement;

    fireEvent.mouseDown(backdrop);
    fireEvent.click(backdrop);
    act(() => vi.advanceTimersByTime(500));

    expect(onClose).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("closes on a backdrop click when there is nothing to lose", () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    const { container } = open(onClose);
    const backdrop = container.querySelector("dialog > div") as HTMLElement;

    fireEvent.mouseDown(backdrop);
    fireEvent.click(backdrop);
    act(() => vi.advanceTimersByTime(120));

    expect(onClose).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("ignores a drag that started inside the panel and ended outside it", () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    const { container } = open(onClose);
    const backdrop = container.querySelector("dialog > div") as HTMLElement;

    // Selecting text in a field and releasing past the panel's edge is not a dismissal.
    fireEvent.mouseDown(screen.getByText("A sheet"));
    fireEvent.click(backdrop);
    act(() => vi.advanceTimersByTime(500));

    expect(onClose).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
