export default class EventRaiser
{
  constructor()
  {
    this.events = new Map();
  }

  /**
   * 
   * @param {string} name 
   */
  addEvent(name)
  {
    this.events.set(name, []);
  }

  /**
   * 
   * @param {string} name 
   * @param parameters 
   */
  triggerEvent(name, ...parameters)
  {
    let listeners = this.events.get(name);

    // make a copy as events can be destroyed in the loop
    listeners = [...listeners];

    for(let listener of listeners) {
      listener.callback(...parameters);

      if(listener.singleUse)
        listener.destroy();
    }
  }

  /**
   * 
   * @param event 
   * @param callback 
   */
  on(event, callback){
    let listener = new EventListener(this, event, callback);

    this.events.get(event).push(listener);

    return listener;
  }

  /**
   * 
   * @param {string} event 
   * @param callback 
   */
  once(event, callback) {
    let promise = new Promise((resolve, reject) => {
      let listener = this.on(event, (...args) => {
        if(callback)
          callback(...args);
        resolve(...args);
      });

      listener.singleUse = true;
    });

    return promise;
  }
}

class EventListener
{
  constructor(eventRaiser, event, callback)
  {
    this.eventRaiser = eventRaiser;
    this.event = event;
    this.callback = callback;
    this.singleUse = false
  }

  destroy()
  {
    let listeners = this.eventRaiser.events.get(this.event);
    let index = listeners.indexOf(this);
    listeners.splice(index, 1);
  }
}
