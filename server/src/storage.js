class Storage {
  constructor() {
    this.allItems = new Map();
    this.selectedItems = new Map();
    this.selectedOrder = [];
    this.initItems();
  }

  initItems() {
    // note: типа сущности из БД
    for (let i = 1; i <= 1_000_000; i++) {
      this.allItems.set(i, { id: i, text: `Элемент ${i}` });
    }
  }

  getItems(offset = 0, limit = 20, filter = '') {
    let items = [];
    let count = 0;
    
    for (let [id, item] of this.allItems) {
      if (filter && !id.toString().includes(filter) && 
          !item.text.includes(filter)) {
        continue;
      }
      
      if (this.selectedItems.has(id)) {
        continue;
      }
      
      if (count >= offset && items.length < limit) {
        items.push(item);
      }
      count++;
    }
    
    return {
      items,
      total: count,
      hasMore: count > offset + limit
    };
  }

  getSelectedItems(offset = 0, limit = 20, filter = '') {
    let items = [];
    let count = 0;
    
    for (let id of this.selectedOrder) {
      const item = this.selectedItems.get(id);
      if (!item) continue;
      
      if (filter && !id.toString().includes(filter) && 
          !item.text.includes(filter)) {
        continue;
      }
      
      if (count >= offset && items.length < limit) {
        items.push({ ...item, order: count });
      }
      count++;
    }
    
    return {
      items,
      total: count,
      hasMore: count > offset + limit
    };
  }

  addToSelected(id) {
    const item = this.allItems.get(parseInt(id));
    if (item && !this.selectedItems.has(item.id)) {
      this.selectedItems.set(item.id, item);
      this.selectedOrder.push(item.id);
      return true;
    }
    return false;
  }

  removeFromSelected(id) {
    id = parseInt(id);
    if (this.selectedItems.has(id)) {
      this.selectedItems.delete(id);
      this.selectedOrder = this.selectedOrder.filter(itemId => itemId !== id);
      return true;
    }
    return false;
  }

  updateOrder(newOrder) {
    const validOrder = newOrder.filter(id => this.selectedItems.has(parseInt(id)));
    this.selectedOrder = validOrder.map(id => parseInt(id));
    return true;
  }

  addNewItem(id, text) {
    id = parseInt(id);
    if (this.allItems.has(id) || id <= 0) {
      return false;
    }
    
    const item = { id, text: text || `Элемент ${id}` };
    this.allItems.set(id, item);
    return true;
  }

  getState() {
    return {
      selectedOrder: [...this.selectedOrder],
      selectedItems: Array.from(this.selectedItems.keys())
    };
  }

  restoreState(state) {
    if (state && state.selectedOrder) {
      this.selectedOrder = state.selectedOrder;
      this.selectedItems.clear();
      state.selectedOrder.forEach(id => {
        const item = this.allItems.get(id);
        if (item) {
          this.selectedItems.set(id, item);
        }
      });
    }
  }
}

let storageInstance = null;

export function setupStorage() {
  if (!storageInstance) {
    storageInstance = new Storage();
  }
  return storageInstance;
}