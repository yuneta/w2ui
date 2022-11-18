/**
 * Part of w2ui 2.0 library
 *  - Dependencies: mQuery, w2utils, w2base
 *
 */

import { w2base } from './w2base.js'
import { w2utils } from './w2utils.js'
import { query } from './query.js'

class w2window extends w2base {
    constructor(options) {
        // name must be an unique name, will be the #id of div html
        if (!options.name) options.name = 'w2w-' + Math.random().toString(36).slice(2, 7)

        super(options.name)
        this.defaults = {
            title: '',
            text: '',           // just a text (will be centered), preference over body
            body: '',
            buttons: '',        // html code of buttons, preference over actions
            x: 300,
            y: 20,
            width: 600,
            height: 500,
            focus: null,        // brings focus to the element, can be a number or selector
            actions: null,      // actions object
            style: '',          // style of the message div
            modal: false,
            maximized: false,   // this is a flag to show the state - to open the window maximized use openMaximized instead
            keyboard: true,     // will close window on esc if not modal
            showClose: true,
            showMax: false,
            openMaximized: false,
            center: false,
            resizable: true
        }
        this.status = 'opening' // string that describes current status
        this.onOpen = null
        this.onClose = null
        this.onMax = null
        this.onMin = null
        this.onToggle = null
        this.onKeydown = null
        this.onAction = null
        this.onMove = null
        // event handler for resize
        this.handleResize = (event) => {
            // Browser window resize
            let rect = {x: options.x, y: options.y, width: options.width, height: options.height}
            rect = this.do_fix_dimension_to_screen(rect.x, rect.y, rect.width, rect.height)
            if (this.options.center)
                rect = this.do_center(rect.x, rect.y, rect.width, rect.height)
            this.resize(rect.x, rect.y, rect.width, rect.height)
        }
        this.name = options.name
        if (!this.box) {
            this.box = '#' + this.name
        }

        // check if window already exists
        if (query(this.box) && query(this.box).find('.w2ui-window').length > 0) {
            console.log(`w2window already exists: ${this.box}`)
            return
        }

        // process options
        if (options.text != null) options.body = `<div class="w2ui-centered w2ui-msg-text">${options.text}</div>`
        options = Object.assign(
            {}, this.defaults, { title: '', body : '' }, options, { maximized: false }
        )
        this.options = options

        this.render(options)
    }

    render(options) {
        let self = this
        if (typeof this.box == 'string') {
            this.box = query(this.box).get(0)
        }

        let rect = this.do_fix_dimension_to_screen(options.x, options.y, options.width, options.height)
        if (this.options.center)
            rect = this.do_center(rect.x, rect.y, rect.width, rect.height)
        this.resize(rect.x, rect.y, rect.width, rect.height)
        let styles = `
            left: ${rect.x}px;
            top: ${rect.y}px;
            width: ${rect.width}px;
            height: ${rect.height}px;
        `
        let msg, id
        if (!this.box) {
            // Create new container
            id = this.name
            msg = `<div id="${id}" class="w2ui-window" style="${w2utils.stripSpaces(styles)}"></div>`
            query('body').append(msg)
            this.box = query('#' + id).get(0)
        } else {
            // TODO code not proved
            this.box.style.cssText = w2utils.stripSpaces(styles)
            this.box.addClass('w2ui-window')
        }
        if (!this.box) {
            console.log('w2window: no container')
            return
        }

        // assign events
        Object.keys(options).forEach(key => {
            if (key.startsWith('on') && key != 'on' && options[key]) {
                this[key] = options[key]
            }
        })

        // convert action arrays into buttons
        if (options.actions != null && !options.buttons) {
            options.buttons = ''
            Object.keys(options.actions).forEach((action) => {
                let handler = options.actions[action]
                let btnAction = action
                if (typeof handler == 'function') {
                    options.buttons += `<button class="w2ui-btn w2ui-eaction" data-click='["action","${action}","event"]'>${action}</button>`
                }
                if (typeof handler == 'object') {
                    options.buttons += `<button class="w2ui-btn w2ui-eaction ${handler.class || ''}" name="${action}" data-click='["action","${action}","event"]'
                        style="${handler.style}" ${handler.attrs}>${handler.text || action}</button>`
                    btnAction = Array.isArray(options.actions) ? handler.text : action
                }
                if (typeof handler == 'string') {
                    options.buttons += `<button class="w2ui-btn w2ui-eaction" data-click='["action","${handler}","event"]'>${handler}</button>`
                    btnAction = handler
                }
                if (typeof btnAction == 'string') {
                    btnAction = btnAction[0].toLowerCase() + btnAction.substr(1).replace(/\s+/g, '')
                }
            })
        }

        // trigger event
        let edata = this.trigger('open', { target: 'window', present: false })
        if (edata.isCancelled === true) return
        this.status = 'opening'
        // output message
        w2utils.lock(document.body, {
            onClick: options.modal ? null : () => { this.destroy() }
        })
        let btn = ''
        if (options.showClose) {
            btn += `<div class="w2ui-window-button w2ui-window-close">
                        <span class="w2ui-icon w2ui-icon-cross w2ui-eaction" data-mousedown="stop" data-click="close"></span>
                    </div>`
        }
        if (options.showMax) {
            btn += `<div class="w2ui-window-button w2ui-window-max">
                        <span class="w2ui-icon w2ui-icon-box w2ui-eaction" data-mousedown="stop" data-click="toggle"></span>
                    </div>`
        }

        // insert content
        styles = `${!options.title ? 'top: 0px !important;' : ''} ${!options.buttons ? 'bottom: 0px !important;' : ''}`
        msg = `
            <span name="hidden-first" tabindex="0" style="position: absolute; top: -100px"></span>
            <div class="w2ui-window-title" style="${!options.title ? 'display: none' : ''}">${btn}</div>
            <div class="w2ui-box" style="${styles}">
                <div class="w2ui-window-body ${!options.title || ' w2ui-window-no-title'}
                    ${!options.buttons || ' w2ui-window-no-buttons'}" style="${options.style}">
                </div>
            </div>
            <div class="w2ui-window-buttons" style="${!options.buttons ? 'display: none' : ''}"></div>
            <div class="w2ui-window-button w2ui-window-resize" style="${!options.resizable ? 'display: none' : ''}">
                <span class="w2ui-icon w2ui-icon-resize"></span>
            </div>
            <span name="hidden-last" tabindex="0" style="position: absolute; top: -100px"></span>
        `
        query(this.box).html(msg)

        if (options.title) query(this.box).find('.w2ui-window-title').append(w2utils.lang(options.title))
        if (options.buttons) query(this.box).find('.w2ui-window-buttons').append(options.buttons)
        if (options.body) query(this.box).find('.w2ui-window-body').append(options.body)

        // allow element to render
        w2utils.bindEvents(query(this.box).find('.w2ui-eaction'), this)
        query(this.box).find('.w2ui-window-body').show()

        this.status = 'open'
        self.setFocus(options.focus)
        // event after
        edata.finish()

        if (options.openMaximized) {
            this.max()
        }
        // save new options
        options._last_focus = document.activeElement
        // keyboard events
        if (options.keyboard) {
            query(document.body).on('keydown', (event) => {
                this.keydown(event)
            })
        }
        query(window).on('resize', this.handleResize)

        // initialize move
        let tmp_move = {
            moving : false,
            mvMove   : mvMove,
            mvStop   : mvStop
        }
        query(this.box).find('.w2ui-window-title').on('mousedown', function(event) {
            if (!self.options.maximized) mvStart(event)
        })

        // initialize resizing
        let tmp_resize = {
            resizing : false,
            rsMove   : rsMove,
            rsStop   : rsStop
        }
        query(this.box).find('.w2ui-window-resize').on('mousedown', function(event) {
            if (!self.options.maximized) rsStart(event)
        })

        return

        // handlers moving
        function mvStart(evt) {
            if (!evt) evt = window.event
            self.status = 'moving'
            let rect = query(self.box).get(0).getBoundingClientRect()
            Object.assign(tmp_move, {
                moving: true,
                isLocked: query(self.box).find(':scope > .w2ui-lock').length == 1 ? true : false,
                x       : evt.screenX,
                y       : evt.screenY,
                pos_x   : rect.x,
                pos_y   : rect.y,
            })
            if (!tmp_move.isLocked) self.lock({ opacity: 0 })
            query(document.body)
                .on('mousemove.w2ui-window', tmp_move.mvMove)
                .on('mouseup.w2ui-window', tmp_move.mvStop)
            if (evt.stopPropagation) evt.stopPropagation(); else evt.cancelBubble = true
            if (evt.preventDefault) evt.preventDefault(); else return false
        }

        function mvMove(evt) {
            if (tmp_move.moving != true) return
            if (!evt) evt = window.event
            tmp_move.div_x = evt.screenX - tmp_move.x
            tmp_move.div_y = evt.screenY - tmp_move.y
            // trigger event
            let rect = query(self.box).get(0).getBoundingClientRect()
            let edata = self.trigger('moving', { target: 'window', rect:rect, originalEvent: evt })
            if (edata.isCancelled === true) return
            // default behavior
            query(self.box).css({
                'transition': 'none',
                'transform' : 'translate3d('+ tmp_move.div_x +'px, '+ tmp_move.div_y +'px, 0px)'
            })
            self.options.center = false
            // event after
            edata.finish()
        }

        function mvStop(evt) {
            if (tmp_move.moving != true) return
            if (!evt) evt = window.event
            self.status = 'open'
            tmp_move.div_x      = (evt.screenX - tmp_move.x)
            tmp_move.div_y      = (evt.screenY - tmp_move.y)
            let x = tmp_move.pos_x + tmp_move.div_x
            let y = tmp_move.pos_y + tmp_move.div_y
            query(self.box)
                .css({
                    'left': x + 'px',
                    'top' : y + 'px'
                })
                .css({
                    'transition': 'none',
                    'transform' : 'translate3d(0px, 0px, 0px)'
                })
            tmp_move.moving = false
            query(document.body).off('.w2ui-window')
            if (!tmp_move.isLocked) self.unlock()

            // trigger event
            let rect = query(self.box).get(0).getBoundingClientRect()
            self.options.x = rect.x
            self.options.y = rect.y
            self.options.width = rect.width
            self.options.height = rect.height
            let edata = self.trigger('moved', { target: 'window', rect: rect, originalEvent: evt })
            // event after
            edata.finish()
        }

        // handlers resizing
        function rsStart(evt) {
            if (!evt) evt = window.event
            self.status = 'resizing'
            let rect = query(self.box).get(0).getBoundingClientRect()
            Object.assign(tmp_resize, {
                resizing: true,
                isLocked: query(self.box).find(':scope > .w2ui-lock').length == 1 ? true : false,
                x       : evt.screenX,
                y       : evt.screenY,
                pos_x   : rect.x,
                pos_y   : rect.y,
            })
            if (!tmp_resize.isLocked) self.lock({ opacity: 0 })
            query(document.body)
                .on('mousemove.w2ui-window', tmp_resize.rsMove)
                .on('mouseup.w2ui-window', tmp_resize.rsStop)
            if (evt.stopPropagation) evt.stopPropagation(); else evt.cancelBubble = true
            if (evt.preventDefault) evt.preventDefault(); else return false
        }

        function rsMove(evt) {
            if (tmp_resize.resizing != true) return
            if (!evt) evt = window.event
            tmp_resize.div_x = evt.screenX - tmp_resize.x
            tmp_resize.div_y = evt.screenY - tmp_resize.y
            // trigger event
            let rect = query(self.box).get(0).getBoundingClientRect()
            let edata = self.trigger('resizing', { target: 'window', rect:rect, originalEvent: evt })
            if (edata.isCancelled === true) return
            // default behavior
            query(self.box).css({
                'transition': 'none',
                'transform' : 'scale('+ tmp_resize.div_x +'px, '+ tmp_resize.div_y +'px)'
            })
            self.options.center = false
            // event after
            edata.finish()
        }

        function rsStop(evt) {
            if (tmp_resize.resizing != true) return
            if (!evt) evt = window.event
            self.status = 'open'
            tmp_resize.div_x      = (evt.screenX - tmp_resize.x)
            tmp_resize.div_y      = (evt.screenY - tmp_resize.y)
            let x = tmp_resize.pos_x + tmp_resize.div_x
            let y = tmp_resize.pos_y + tmp_resize.div_y
            query(self.box)
                .css({
                    'width': x + 'px',
                    'height' : y + 'px'
                })
                .css({
                    'transition': 'none',
                    'transform' : 'scale(0px, 0px)'
                })
            tmp_resize.resizing = false
            query(document.body).off('.w2ui-window')
            if (!tmp_resize.isLocked) self.unlock()

            // trigger event
            let rect = query(self.box).get(0).getBoundingClientRect()
            self.options.x = rect.x
            self.options.y = rect.y
            self.options.width = rect.width
            self.options.height = rect.height
            let edata = self.trigger('moved', { target: 'window', rect: rect, originalEvent: evt })
            // event after
            edata.finish()
        }
    }

    destroy() {
        this.close()
    }
    close() {
        // trigger event
        let edata = this.trigger('close', { target: 'window' })
        if (edata.isCancelled === true) return
        query(this.box).remove()
        // restore active
        if (this.options._last_focus && this.options._last_focus.length > 0) this.options._last_focus.focus()
        this.status = 'destroyed'
        // event after
        edata.finish()

        // remove keyboard events
        if (this.options.keyboard) {
            query(document.body).off('keydown', this.keydown)
        }
        query(window).off('resize', this.handleResize)
        w2utils.unlock(document.body, 0)
    }

    load(options) {
        return new Promise((resolve, reject) => {
            if (typeof options == 'string') {
                options = { url: options }
            }
            if (options.url == null) {
                console.log('ERROR: The url is not defined.')
                reject('The url is not defined')
                return
            }
            this.status = 'loading'
            let [url, selector] = String(options.url).split('#')
            if (url) {
                fetch(url).then(res => res.text()).then(html => {
                    resolve(this.template(html, selector, options))
                })
            }
        })
    }

    template(data, id, options = {}) {
        let html
        try {
            html = query(data)
        } catch (e) {
            html = query.html(data)
        }
        if (id) html = html.filter('#' + id)
        Object.assign(options, {
            width: parseInt(query(html).css('width')),
            height: parseInt(query(html).css('height')),
            title: query(html).find('[rel=title]').html(),
            body: query(html).find('[rel=body]').html(),
            buttons: query(html).find('[rel=buttons]').html(),
            style: query(html).find('[rel=body]').get(0).style.cssText,
        })
        return this.open(options)
    }

    action(action, event) {
        let click = this.options.actions[action]
        if (click instanceof Object && click.onClick) click = click.onClick
        // event before
        let edata = this.trigger('action', { action, target: 'window', self: this,
            originalEvent: event, value: this.input ? this.input.value : null })
        if (edata.isCancelled === true) return
        // default actions
        if (typeof click === 'function') click.call(this, event)
        // event after
        edata.finish()
    }

    keydown(event) {
        if (this.options && !this.options.keyboard) return
        // trigger event
        let edata = this.trigger('keydown', { target: 'window', originalEvent: event })
        if (edata.isCancelled === true) return
        // default behavior
        switch (event.keyCode) {
            case 27:
                event.preventDefault()
                if (query(this.box).find('.w2ui-message').length == 0) {
                    if (this.options.cancelAction) {
                        this.action(this.options.cancelAction)
                    } else {
                        this.destroy()
                    }
                }
                break
        }
        // event after
        edata.finish()
    }

    toggle() {
        let edata = this.trigger('toggle', { target: 'window' })
        if (edata.isCancelled === true) return
        // default action
        if (this.options.maximized === true) this.min(); else this.max()
        // event after
        edata.finish()
    }

    max() {
        if (this.options.maximized === true) return
        // trigger event
        let edata = this.trigger('max', { target: 'window' })
        if (edata.isCancelled === true) return
        // default behavior
        this.status = 'resizing'
        this.prevSize = query(this.box).get(0).getBoundingClientRect()
        // do resize
        let rect = this.do_fix_dimension_to_screen(0, 0, 10000, 10000)
        if (this.options.center)
            rect = this.do_center(rect.x, rect.y, rect.width, rect.height)
        this.resize(rect.x, rect.y, rect.width, rect.height, () => {
            this.status    = 'open'
            this.options.maximized = true
            edata.finish()
        })
    }

    min() {
        if (this.options.maximized !== true) return
        let rect = this.prevSize
        // trigger event
        let edata = this.trigger('min', { target: 'window' })
        if (edata.isCancelled === true) return
        // default behavior
        this.status = 'resizing'
        // do resize
        rect = this.do_fix_dimension_to_screen(rect.x, rect.y, rect.width, rect.height)
        if (this.options.center)
            rect = this.do_center(rect.x, rect.y, rect.width, rect.height)
        this.options.maximized = false
        this.resize(parseInt(rect.x), parseInt(rect.y), parseInt(rect.width), parseInt(rect.height), () => {
            this.status = 'open'
            this.prevSize  = null
            edata.finish()
        })
    }

    resize(x, y, width, height, callBack) {
        let self = this
        query(this.box).css({
            'top'   : y + 'px',
            'left'  : x + 'px',
            'width' : width + 'px',
            'height': height + 'px'
        })
        self.resizeMessages()
        if (typeof callBack == 'function') callBack()
    }

    // internal function
    resizeMessages() {
        // see if there are messages and resize them
        query(this.box).find('.w2ui-message').each(msg => {
            let mopt = msg._msg_options
            let window = query(this.box)
            if (parseInt(mopt.width) < 10) mopt.width = 10
            if (parseInt(mopt.height) < 10) mopt.height = 10
            let rect = window[0].getBoundingClientRect()
            let titleHeight = parseInt(window.find('.w2ui-window-title')[0].clientHeight)
            let pWidth      = parseInt(rect.width)
            let pHeight     = parseInt(rect.height)
            // re-calc width
            mopt.width = mopt.originalWidth
            if (mopt.width > pWidth - 10) {
                mopt.width = pWidth - 10
            }
            // re-calc height
            mopt.height = mopt.originalHeight
            if (mopt.height > pHeight - titleHeight - 5) {
                mopt.height = pHeight - titleHeight - 5
            }
            if (mopt.originalHeight < 0) mopt.height = pHeight + mopt.originalHeight - titleHeight
            if (mopt.originalWidth < 0) mopt.width = pWidth + mopt.originalWidth * 2 // x 2 because there is left and right margin
            query(msg).css({
                left    : ((pWidth - mopt.width) / 2) + 'px',
                width   : mopt.width + 'px',
                height  : mopt.height + 'px'
            })
        })
    }

    do_fix_dimension_to_screen(x, y, width, height) {
        let maxW, maxH
        if (window.innerHeight == undefined) {
            maxW = document.documentElement.offsetWidth
            maxH = document.documentElement.offsetHeight
        } else {
            maxW = window.innerWidth
            maxH = window.innerHeight
        }

        if (maxW > width) {
            if (x + width > maxW) {
                x = maxW - width
            }
        } else if (maxW <= width) {
            x = 0
            width = maxW
        }

        if (maxH > height) {
            if (y + height > maxH) {
                y = maxH - height
            }
        } else if (maxH <= height) {
            y = 0
            height = maxH
        }

        return {x, y, width, height}
    }

    do_center(x, y, width, height) {
        let maxW, maxH
        if (window.innerHeight == undefined) {
            maxW = document.documentElement.offsetWidth
            maxH = document.documentElement.offsetHeight
        } else {
            maxW = window.innerWidth
            maxH = window.innerHeight
        }

        if (maxW > width) {
            x = (maxW - width)/2
        } else if (maxW < width) {
            x = 0
        }

        if (maxH > height) {
            y = (maxH - height)/2
        } else if (maxH < height) {
            y = 0
        }

        return {x, y}
    }

    clear() {
        query(this.box).find('.w2ui-window-title').html('')
        query(this.box).find('.w2ui-window-body').html('')
        query(this.box).find('.w2ui-window-buttons').html('')
    }

    setFocus(focus) {
        let box = query(this.box)
        let sel = 'input, button, select, textarea, [contentEditable], .w2ui-input'
        if (focus != null) {
            let el = isNaN(focus)
                ? box.find(sel).filter(focus).get(0)
                : box.find(sel).get(focus)
            el?.focus()
        } else {
            let el = box.find('[name=hidden-first]').get(0)
            if (el) el.focus()
        }
        // keep focus/blur inside window
        query(box).find(sel + ',[name=hidden-first],[name=hidden-last]')
            .off('.keep-focus')
            .on('blur.keep-focus', function (event) {
                setTimeout(() => {
                    let focus = document.activeElement
                    let inside = query(box).find(sel).filter(focus).length > 0
                    let name = query(focus).attr('name')
                    if (!inside && focus && focus !== document.body) {
                        query(box).find(sel).get(0)?.focus()
                    }
                    if (name == 'hidden-last') {
                        query(box).find(sel).get(0)?.focus()
                    }
                    if (name == 'hidden-first') {
                        query(box).find(sel).get(-1)?.focus()
                    }
                }, 1)
            })
    }

    lock(msg, showSpinner) {
        let args = Array.from(arguments)
        args.unshift(query(this.box))
        w2utils.lock(...args)
    }

    unlock() {
        w2utils.unlock(query(this.box), 0)
    }
}

export { w2window }
