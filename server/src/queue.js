class RequestQueue {
  constructor(storage) {
    this.storage = storage;
    this.queue = new Map();
    this.processing = false;
    this.batchTimer = null;
    this.addBatch = [];
    this.lastGetTime = 0;
    this.lastUpdateTime = 0;
    
    this.ADD_BATCH_INTERVAL = 10000; // 10 секунд
    this.GET_INTERVAL = 1000; // 1 секунда
    this.UPDATE_INTERVAL = 1000; // 1 секунда
  }

  async addAddRequest(id, text) {
    const key = `add_${id}`;

    if (this.queue.has(key)) {
      return { success: false, message: 'Запрос уже в обработке' };
    }
    
    this.addBatch.push({ id, text });
    
    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => this.processAddBatch(), this.ADD_BATCH_INTERVAL);
    }
    
    this.queue.set(key, { type: 'add', id, text });
    return { success: true, message: 'Запрос добавлен в очередь' };
  }

  async processAddBatch() {
    if (this.addBatch.length === 0) {
      this.batchTimer = null;
      return;
    }
    
    console.log(`Обрабатываю батч из ${this.addBatch.length} добавлений`);
    
    const results = [];
    for (const request of this.addBatch) {
      const success = this.storage.addNewItem(request.id, request.text);
      const key = `add_${request.id}`;
      this.queue.delete(key);
      results.push({ id: request.id, success });
    }
    
    this.addBatch = [];
    this.batchTimer = null;
    console.log('Обработка батча завершена: ', results)
    // return results;
  }

  async getItems(offset, limit, filter, isSelected = false) {
    const now = Date.now();
    const key = `get_${isSelected ? 'selected_' : ''}${offset}_${limit}_${filter}`;
    
    if (this.queue.has(key)) {
      return this.queue.get(key).promise;
    }
    
    if (now - this.lastGetTime < this.GET_INTERVAL) {
      await new Promise(resolve => 
        setTimeout(resolve, this.GET_INTERVAL - (now - this.lastGetTime))
      );
    }
    
    const promise = (async () => {
      this.lastGetTime = Date.now();
      const result = isSelected 
        ? this.storage.getSelectedItems(offset, limit, filter)
        : this.storage.getItems(offset, limit, filter);
      
      setTimeout(() => this.queue.delete(key), 1000);
      
      return result;
    })();
    
    this.queue.set(key, { promise });
    return promise;
  }

  async updateState(action, data) {
    const now = Date.now();
    const key = `update_${action}_${JSON.stringify(data)}`;
    
    if (this.queue.has(key)) {
      return this.queue.get(key).promise;
    }
    
    if (now - this.lastUpdateTime < this.UPDATE_INTERVAL) {
      await new Promise(resolve => 
        setTimeout(resolve, this.UPDATE_INTERVAL - (now - this.lastUpdateTime))
      );
    }
    
    const promise = (async () => {
      this.lastUpdateTime = Date.now();
      let result;
      
      switch (action) {
        case 'add':
          result = this.storage.addToSelected(data.id);
          break;
        case 'remove':
          result = this.storage.removeFromSelected(data.id);
          break;
        case 'reorder':
          result = this.storage.updateOrder(data.order);
          break;
        default:
          result = false;
      }
      
      setTimeout(() => this.queue.delete(key), 1000);
      
      return { success: result };
    })();
    
    this.queue.set(key, { promise });
    return promise;
  }
}

export function setupQueue(storage) {
  return new RequestQueue(storage);
}