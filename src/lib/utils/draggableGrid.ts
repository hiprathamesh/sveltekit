import { gsap } from 'gsap';

interface Position {
  x: number;
  y: number;
}

interface DraggableGridOptions {
  onDragStart?: (element: HTMLElement) => void;
  onDragEnd?: (element: HTMLElement) => void;
  onSwap?: (element1: HTMLElement, element2: HTMLElement) => void;
}

export class DraggableGrid {
  private container: HTMLElement;
  private items: HTMLElement[];
  private draggedElement: HTMLElement | null = null;
  private initialPosition: Position = { x: 0, y: 0 };
  private currentPosition: Position = { x: 0, y: 0 };
  private offset: Position = { x: 0, y: 0 };
  private options: DraggableGridOptions;

  constructor(container: HTMLElement, options: DraggableGridOptions = {}) {
    this.container = container;
    this.items = Array.from(container.children) as HTMLElement[];
    this.options = options;
    this.init();
  }

  private init() {
    this.items.forEach(item => {
      item.style.position = 'relative';
      item.style.userSelect = 'none';
      item.style.touchAction = 'none';
      
      this.addDragListeners(item);
    });
  }

  private addDragListeners(element: HTMLElement) {
    element.addEventListener('mousedown', this.handleDragStart.bind(this));
    element.addEventListener('touchstart', this.handleDragStart.bind(this));
    
    document.addEventListener('mousemove', this.handleDragMove.bind(this));
    document.addEventListener('touchmove', this.handleDragMove.bind(this));
    
    document.addEventListener('mouseup', this.handleDragEnd.bind(this));
    document.addEventListener('touchend', this.handleDragEnd.bind(this));
  }

  private handleDragStart(e: MouseEvent | TouchEvent) {
    if (!(e.target as HTMLElement).closest('[data-draggable]')) return;
    
    e.preventDefault();
    this.draggedElement = (e.target as HTMLElement).closest('[data-draggable]') as HTMLElement;
    
    const rect = this.draggedElement.getBoundingClientRect();
    const clientX = e instanceof MouseEvent ? e.clientX : e.touches[0].clientX;
    const clientY = e instanceof MouseEvent ? e.clientY : e.touches[0].clientY;

    this.initialPosition = {
      x: rect.left,
      y: rect.top
    };

    this.offset = {
      x: clientX - rect.left,
      y: clientY - rect.top
    };

    this.draggedElement.style.zIndex = '1000';
    this.draggedElement.style.transition = 'none';
    this.draggedElement.style.transform = 'scale(1.05)';

    if (this.options.onDragStart) {
      this.options.onDragStart(this.draggedElement);
    }
  }

  private handleDragMove(e: MouseEvent | TouchEvent) {
    if (!this.draggedElement) return;
    
    e.preventDefault();
    
    const clientX = e instanceof MouseEvent ? e.clientX : e.touches[0].clientX;
    const clientY = e instanceof MouseEvent ? e.clientY : e.touches[0].clientY;

    this.currentPosition = {
      x: clientX - this.offset.x,
      y: clientY - this.offset.y
    };

    gsap.to(this.draggedElement, {
      x: this.currentPosition.x - this.initialPosition.x,
      y: this.currentPosition.y - this.initialPosition.y,
      duration: 0.1,
      ease: "power2.out"
    });

    const targetElement = this.findTargetElement(clientX, clientY);
    if (targetElement && targetElement !== this.draggedElement) {
      this.swapElements(this.draggedElement, targetElement);
    }
  }

  private handleDragEnd(e: MouseEvent | TouchEvent) {
    if (!this.draggedElement) return;

    gsap.to(this.draggedElement, {
      x: 0,
      y: 0,
      scale: 1,
      duration: 0.3,
      ease: "back.out(1.5)",
      clearProps: "all",
      onComplete: () => {
        if (this.draggedElement) {
          this.draggedElement.style.zIndex = '';
          this.draggedElement.style.transition = '';
          
          if (this.options.onDragEnd) {
            this.options.onDragEnd(this.draggedElement);
          }
        }
      }
    });

    this.draggedElement = null;
  }

  private findTargetElement(x: number, y: number): HTMLElement | null {
    const elements = document.elementsFromPoint(x, y);
    for (const element of elements) {
      if (element !== this.draggedElement && element.hasAttribute('data-draggable')) {
        return element as HTMLElement;
      }
    }
    return null;
  }

  private swapElements(element1: HTMLElement, element2: HTMLElement) {
    const rect1 = element1.getBoundingClientRect();
    const rect2 = element2.getBoundingClientRect();

    const timeline = gsap.timeline({
      defaults: {
        duration: 0.3,
        ease: "power2.inOut"
      }
    });

    timeline.to(element2, {
      x: rect1.left - rect2.left,
      y: rect1.top - rect2.top,
      onComplete: () => {
        // Swap grid areas
        const area1 = element1.style.gridArea;
        element1.style.gridArea = element2.style.gridArea;
        element2.style.gridArea = area1;

        // Reset positions
        gsap.set([element1, element2], { clearProps: "transform" });

        if (this.options.onSwap) {
          this.options.onSwap(element1, element2);
        }
      }
    });
  }

  public destroy() {
    this.items.forEach(item => {
      item.removeEventListener('mousedown', this.handleDragStart.bind(this));
      item.removeEventListener('touchstart', this.handleDragStart.bind(this));
    });
    
    document.removeEventListener('mousemove', this.handleDragMove.bind(this));
    document.removeEventListener('touchmove', this.handleDragMove.bind(this));
    document.removeEventListener('mouseup', this.handleDragEnd.bind(this));
    document.removeEventListener('touchend', this.handleDragEnd.bind(this));
  }
}