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
            text: '',           // just a text (will be centered)
            body: '',
            buttons: '',
            width: 450,
            height: 250,
            focus: null,        // brings focus to the element, can be a number or selector
            actions: null,      // actions object
            style: '',          // style of the message div
            modal: false,
            maximized: false,   // this is a flag to show the state - to open the popup maximized use openMaximized instead
            keyboard: true,     // will close popup on esc if not modal
            showClose: true,
            showMax: false,
            transition: null,
            openMaximized: false,
            moved: false,
            x: undefined, // Set x,y to some value will not center the window (it be considered moved)
            y: undefined
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
        this.tmp = {}
        // event handler for resize
        this.handleResize = (event) => {
            // if it was moved by the user, do not auto resize
            if (!this.options.moved) {
                this.center(undefined, undefined, true)
            }
        }
        this.name = options.name
        if (!this.box) {
            this.box = '#' + this.name
        }

        // check if window already exists
        if (query(this.box) && query(this.box).find('.w2ui-popup').length > 0) {
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

        let { top, left } = this.center()
        if (options.x !== undefined && options.y !== undefined) {
            left = options.x
            top = options.y
            options.moved = true
        }
        let styles = `
            left: ${left}px;
            top: ${top}px;
            width: ${parseInt(options.width)}px;
            height: ${parseInt(options.height)}px;
        `
        let msg, id
        if (!this.box) {
            // Create new container
            id = this.name
            msg = `<div id="${id}" class="w2ui-popup" style="${w2utils.stripSpaces(styles)}"></div>`
            query('body').append(msg)
            this.box = query('#' + id).get(0)
        } else {
            // TODO check this
            this.box.style.cssText = w2utils.stripSpaces(styles)
            this.box.addClass('w2ui-popup')
        }

        // assign events
        Object.keys(options).forEach(key => {
            if (key.startsWith('on') && key != 'on' && options[key]) {
                this[key] = options[key]
            }
        })

        let edata, tmp
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
        edata = this.trigger('open', { target: 'popup', present: false })
        if (edata.isCancelled === true) return
        this.status = 'opening'
        // output message
        w2utils.lock(document.body, {
            onClick: options.modal ? null : () => { this.destroy() }
        })
        let btn = ''
        if (options.showClose) {
            btn += `<div class="w2ui-popup-button w2ui-popup-close">
                        <span class="w2ui-icon w2ui-icon-cross w2ui-eaction" data-mousedown="stop" data-click="close"></span>
                    </div>`
        }
        if (options.showMax) {
            btn += `<div class="w2ui-popup-button w2ui-popup-max">
                        <span class="w2ui-icon w2ui-icon-box w2ui-eaction" data-mousedown="stop" data-click="toggle"></span>
                    </div>`
        }

        // insert content
        styles = `${!options.title ? 'top: 0px !important;' : ''} ${!options.buttons ? 'bottom: 0px !important;' : ''}`
        msg = `
            <span name="hidden-first" tabindex="0" style="position: absolute; top: -100px"></span>
            <div class="w2ui-popup-title" style="${!options.title ? 'display: none' : ''}">${btn}</div>
            <div class="w2ui-box" style="${styles}">
                <div class="w2ui-popup-body ${!options.title || ' w2ui-popup-no-title'}
                    ${!options.buttons || ' w2ui-popup-no-buttons'}" style="${options.style}">
                </div>
            </div>
            <div class="w2ui-popup-buttons" style="${!options.buttons ? 'display: none' : ''}"></div>
            <span name="hidden-last" tabindex="0" style="position: absolute; top: -100px"></span>
        `
        query(this.box).html(msg)

        if (options.title) query(this.box).find('.w2ui-popup-title').append(w2utils.lang(options.title))
        if (options.buttons) query(this.box).find('.w2ui-popup-buttons').append(options.buttons)
        if (options.body) query(this.box).find('.w2ui-popup-body').append(options.body)

        // allow element to render
        w2utils.bindEvents(query(this.box).find('.w2ui-eaction'), this)
        query(this.box).find('.w2ui-popup-body').show()

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
        tmp = {
            resizing : false,
            mvMove   : mvMove,
            mvStop   : mvStop
        }
        query(this.box).find('.w2ui-popup-title').on('mousedown', function(event) {
            if (!self.options.maximized) mvStart(event)
        })

        return

        // handlers
        function mvStart(evt) {
            if (!evt) evt = window.event
            self.status = 'moving'
            let rect = query(self.box).get(0).getBoundingClientRect()
            Object.assign(tmp, {
                resizing: true,
                isLocked: query(self.box).find(':scope > .w2ui-lock').length == 1 ? true : false,
                //isLocked: query(self.box).find('> .w2ui-lock').length == 1 ? true : false,
                x       : evt.screenX,
                y       : evt.screenY,
                pos_x   : rect.x,
                pos_y   : rect.y,
            })
            if (!tmp.isLocked) self.lock({ opacity: 0 })
            query(document.body)
                .on('mousemove.w2ui-popup', tmp.mvMove)
                .on('mouseup.w2ui-popup', tmp.mvStop)
            if (evt.stopPropagation) evt.stopPropagation(); else evt.cancelBubble = true
            if (evt.preventDefault) evt.preventDefault(); else return false
        }

        function mvMove(evt) {
            if (tmp.resizing != true) return
            if (!evt) evt = window.event
            tmp.div_x = evt.screenX - tmp.x
            tmp.div_y = evt.screenY - tmp.y
            // trigger event
            let edata = self.trigger('move', { target: 'popup', div_x: tmp.div_x, div_y: tmp.div_y, originalEvent: evt })
            if (edata.isCancelled === true) return
            // default behavior
            query(self.box).css({
                'transition': 'none',
                'transform' : 'translate3d('+ tmp.div_x +'px, '+ tmp.div_y +'px, 0px)'
            })
            self.options.moved = true
            // event after
            edata.finish()
        }

        function mvStop(evt) {
            if (tmp.resizing != true) return
            if (!evt) evt = window.event
            self.status = 'open'
            tmp.div_x      = (evt.screenX - tmp.x)
            tmp.div_y      = (evt.screenY - tmp.y)
            let x = tmp.pos_x + tmp.div_x
            let y = tmp.pos_y + tmp.div_y
            query(self.box)
                .css({
                    'left': x + 'px',
                    'top' : y + 'px'
                })
                .css({
                    'transition': 'none',
                    'transform' : 'translate3d(0px, 0px, 0px)'
                })
            tmp.resizing = false
            query(document.body).off('.w2ui-popup')
            if (!tmp.isLocked) self.unlock()

            // trigger event
            let edata = self.trigger('stop', { target: 'popup', x: x, y: y, originalEvent: evt })
            // event after
            edata.finish()
        }
    }

    destroy() {
        close()
    }
    close() {
        // trigger event
        let edata = this.trigger('close', { target: 'popup' })
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
        let edata = this.trigger('action', { action, target: 'popup', self: this,
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
        let edata = this.trigger('keydown', { target: 'popup', originalEvent: event })
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
        let edata = this.trigger('toggle', { target: 'popup' })
        if (edata.isCancelled === true) return
        // default action
        if (this.options.maximized === true) this.min(); else this.max()
        // event after
        setTimeout(() => {
            edata.finish()
        }, (this.options.speed * 1000) + 50)
    }

    max() {
        if (this.options.maximized === true) return
        // trigger event
        let edata = this.trigger('max', { target: 'popup' })
        if (edata.isCancelled === true) return
        // default behavior
        this.status = 'resizing'
        let rect = query(this.box).get(0).getBoundingClientRect()
        this.options.prevSize = rect.width + ':' + rect.height
        // do resize
        this.resize(10000, 10000, () => {
            this.status    = 'open'
            this.options.maximized = true
            edata.finish()
        })
    }

    min() {
        if (this.options.maximized !== true) return
        let size = this.options.prevSize.split(':')
        // trigger event
        let edata = this.trigger('min', { target: 'popup' })
        if (edata.isCancelled === true) return
        // default behavior
        this.status = 'resizing'
        // do resize
        this.options.maximized = false
        this.resize(parseInt(size[0]), parseInt(size[1]), () => {
            this.status = 'open'
            this.options.prevSize  = null
            edata.finish()
        })
    }

    clear() {
        query(this.box).find('.w2ui-popup-title').html('')
        query(this.box).find('.w2ui-popup-body').html('')
        query(this.box).find('.w2ui-popup-buttons').html('')
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
        // keep focus/blur inside popup
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

    unlock(speed) {
        w2utils.unlock(query(this.box), speed)
    }

    center(width, height, force) {
        let maxW, maxH
        if (window.innerHeight == undefined) {
            maxW = parseInt(document.documentElement.offsetWidth)
            maxH = parseInt(document.documentElement.offsetHeight)
        } else {
            maxW = parseInt(window.innerWidth)
            maxH = parseInt(window.innerHeight)
        }
        width = parseInt(width ?? this.options.width)
        height = parseInt(height ?? this.options.height)
        if (this.options.maximized === true) {
            width = maxW
            height = maxH
        }
        if (maxW - 10 < width) width = maxW - 10
        if (maxH - 10 < height) height = maxH - 10
        let top  = (maxH - height) / 2
        let left = (maxW - width) / 2
        if (force) {
            query(this.box).css({
                'transition': 'none',
                'top'   : top + 'px',
                'left'  : left + 'px',
                'width' : width + 'px',
                'height': height + 'px'
            })
            this.resizeMessages() // then messages resize nicely
        }
        return { top, left, width, height }
    }

    resize(newWidth, newHeight, callBack) {
        let self = this
        if (this.options.speed == null) this.options.speed = 0
        // calculate new position
        let { top, left, width, height } = this.center(newWidth, newHeight)
        let speed = this.options.speed
        query(this.box).css({
            'transition': `${speed}s width, ${speed}s height, ${speed}s left, ${speed}s top`,
            'top'   : top + 'px',
            'left'  : left + 'px',
            'width' : width + 'px',
            'height': height + 'px'
        })
        let tmp_int = setInterval(() => { self.resizeMessages() }, 10) // then messages resize nicely
        setTimeout(() => {
            clearInterval(tmp_int)
            self.resizeMessages()
            if (typeof callBack == 'function') callBack()
        }, (this.options.speed * 1000) + 50) // give extra 50 ms
    }

    // internal function
    resizeMessages() {
        // see if there are messages and resize them
        query(this.box).find('.w2ui-message').each(msg => {
            let mopt = msg._msg_options
            let popup = query(this.box)
            if (parseInt(mopt.width) < 10) mopt.width = 10
            if (parseInt(mopt.height) < 10) mopt.height = 10
            let rect = popup[0].getBoundingClientRect()
            let titleHeight = parseInt(popup.find('.w2ui-popup-title')[0].clientHeight)
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
}

export { w2window }
