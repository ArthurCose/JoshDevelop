"use strict";

/**
 * @callback eventHandler
 * @param {EventRaiser} eventRaiser
 * @param {...*} parameters
 */

class EventRaiser
{
  constructor()
  {
    this.eventHandlers = {};
  }
  
  /**
   * Create a new event for listeners to listen to
   * @param {*} name 
   */
  addEvent(name)
  {
    this.eventHandlers[name] = [];
  }

  /**
   * Trigger an event by name
   * 
   * @param {*} name event name
   * @param {*} parameters extra parameters to pass to listeners
   */
  triggerEvent(name, ...parameters)
  {
    let eventHandlers = this.eventHandlers[name];
    
    for(let eventHandler of eventHandlers)
      eventHandler(this, ...parameters);
  }
  
  /**
   * Create an event listener.
   * 
   * Make sure to keep a list of listeners on any objects that
   *  become destroyed to prevent calls on destroyed objects
   * 
   * @param {string} event 
   * @param {listenerCallback} listener 
   * @returns {EventListener}
   */
  on(event, listener){
    this.eventHandlers[event].push(listener);

    return new EventListener(this, event, listener);
  }
}

class EventListener
{
  constructor(eventRaiser, event, lambda)
  {
    this.eventRaiser = eventRaiser;
    this.event = event;
    this.lambda = lambda;
  }

  destroy()
  {
    let eventHandlers = this.eventRaiser.eventHandlers[this.event];
    let id = eventHandlers.indexOf(this.lambda);

    eventHandlers.splice(id, 1);
  }
}

if(typeof module !== 'undefined')
    module.exports = EventRaiser;