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
            speed: 0.3,
            modal: false,
            maximized: false,   // this is a flag to show the state - to open the popup maximized use openMaximized instead
            keyboard: true,     // will close popup on esc if not modal
            showClose: true,
            showMax: false,
            transition: null,
            openMaximized: false,
            moved: false
        }
        this.name = options.name // unique name for w2ui
        this.status = 'closed' // string that describes current status
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
        // render if box specified
        // Unique name: https://stackoverflow.com/questions/1349404/generate-random-string-characters-in-javascript
        if (!this.name) this.name = 'window-' + Math.random().toString(36).slice(2, 7)
        this.box = '#' + this.name
        this.open(options)
    }

    open(options) {
        let self = this
        if (this.status == 'closing' || query(this.box).hasClass('animating')) {
            // if called when previous is closing
            this.close(true)
        }
        // get old options and merge them
        let old_options = this.options
        if (['string', 'number'].includes(typeof options)) {
            options = w2utils.extend({
                title: 'Notification',
                body: `<div class="w2ui-centered">${options}</div>`,
                actions: { Ok() { self.close() }},
                cancelAction: 'ok'
            }, arguments[1] ?? {})
        }
        if (options.text != null) options.body = `<div class="w2ui-centered w2ui-msg-text">${options.text}</div>`
        options = Object.assign(
            {}, this.defaults, old_options, { title: '', body : '' }, options, { maximized: false }
        )
        this.options = options
        // if new - reset event handlers
        if (query(this.box).length === 0) {
            this.off('*')
            Object.keys(this).forEach(key => {
                if (key.startsWith('on') && key != 'on') this[key] = null
            })
        }
        // reassign events
        Object.keys(options).forEach(key => {
            if (key.startsWith('on') && key != 'on' && options[key]) {
                this[key] = options[key]
            }
        })
        options.width  = parseInt(options.width)
        options.height = parseInt(options.height)

        let edata, msg, tmp
        let { top, left } = this.center()

        let prom = {
            self: this,
            action(callBack) {
                self.on('action.prom', callBack)
                return prom
            },
            close(callBack) {
                self.on('close.prom', callBack)
                return prom
            },
            then(callBack) {
                self.on('open:after.prom', callBack)
                return prom
            }
        }
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
                prom[btnAction] = function (callBack) {
                    self.on('action.buttons', (event) => {
                        let target = event.detail.action[0].toLowerCase() + event.detail.action.substr(1).replace(/\s+/g, '')
                        if (target == btnAction) callBack(event)
                    })
                    return prom
                }
            })
        }
        // check if message is already displayed
        if (query(this.box) && query(this.box).find('.w2ui-popup').length === 0) {
            // trigger event
            edata = this.trigger('open', { target: 'popup', present: false })
            if (edata.isCancelled === true) return
            this.status = 'opening'
            // output message
            w2utils.lock(document.body, {
                opacity: 0.3,
                onClick: options.modal ? null : () => { this.close() }
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
            // first insert just body
            let styles = `
                left: ${left}px;
                top: ${top}px;
                width: ${parseInt(options.width)}px;
                height: ${parseInt(options.height)}px;
                transition: ${options.speed}s
            `
            let id = this.name
            msg = `<div id="${id}" class="w2ui-popup w2ui-anim-open animating" style="${w2utils.stripSpaces(styles)}"></div>`
            query('body').append(msg)
            query(this.box)[0]._w2popup = {
                self: this,
                created: new Promise((resolve) => { this._promCreated = resolve }),
                opened: new Promise((resolve) => { this._promOpened = resolve }),
                closing: new Promise((resolve) => { this._promClosing = resolve }),
                closed: new Promise((resolve) => { this._promClosed = resolve }),
            }
            // then content
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
            setTimeout(() => {
                query(this.box)
                    .css('transition', options.speed + 's')
                    .removeClass('w2ui-anim-open')
                w2utils.bindEvents(query(this.box).find('.w2ui-eaction'), this)
                query(this.box).find('.w2ui-popup-body').show()
                this._promCreated()
            }, 1)
            // clean transform
            clearTimeout(this._timer)
            this._timer = setTimeout(() => {
                this.status = 'open'
                self.setFocus(options.focus)
                // event after
                edata.finish()
                this._promOpened()
                query(this.box).removeClass('animating')
            }, options.speed * 1000)

        } else {
            // trigger event
            edata = this.trigger('open', { target: 'popup', present: true })
            if (edata.isCancelled === true) return
            // check if size changed
            this.status = 'opening'
            if (old_options != null) {
                if (!old_options.maximized && (old_options.width != options.width || old_options.height != options.height)) {
                    this.resize(options.width, options.height)
                }
                options.prevSize  = options.width + 'px:' + options.height + 'px'
                options.maximized = old_options.maximized
            }
            // show new items
            let cloned = query(this.box).find('.w2ui-box').get(0).cloneNode(true)
            query(cloned).removeClass('w2ui-box').addClass('w2ui-box-temp').find('.w2ui-popup-body').empty().append(options.body)
            query(this.box).find('.w2ui-box').after(cloned)

            if (options.buttons) {
                query(this.box).find('.w2ui-popup-buttons').show().html('').append(options.buttons)
                query(this.box).find('.w2ui-popup-body').removeClass('w2ui-popup-no-buttons')
                query(this.box).find('.w2ui-box').css('bottom', '')
                query(this.box).find('.w2ui-box-temp').css('bottom', '')
            } else {
                query(this.box).find('.w2ui-popup-buttons').hide().html('')
                query(this.box).find('.w2ui-popup-body').addClass('w2ui-popup-no-buttons')
                query(this.box).find('.w2ui-box').css('bottom', '0px')
                query(this.box).find('.w2ui-box-temp').css('bottom', '0px')
            }
            if (options.title) {
                query(this.box).find('.w2ui-popup-title')
                    .show()
                    .html((options.showClose
                        ? `<div class="w2ui-popup-button w2ui-popup-close">
                                <span class="w2ui-icon w2ui-icon-cross w2ui-eaction" data-mousedown="stop" data-click="close"></span>
                            </div>`
                        : '') +
                        (options.showMax
                        ? `<div class="w2ui-popup-button w2ui-popup-max">
                                <span class="w2ui-icon w2ui-icon-box w2ui-eaction" data-mousedown="stop" data-click="toggle"></span>
                            </div>`
                        : ''))
                    .append(options.title)
                query(this.box).find('.w2ui-popup-body').removeClass('w2ui-popup-no-title')
                query(this.box).find('.w2ui-box').css('top', '')
                query(this.box).find('.w2ui-box-temp').css('top', '')
            } else {
                query(this.box).find('.w2ui-popup-title').hide().html('')
                query(this.box).find('.w2ui-popup-body').addClass('w2ui-popup-no-title')
                query(this.box).find('.w2ui-box').css('top', '0px')
                query(this.box).find('.w2ui-box-temp').css('top', '0px')
            }
            // transition
            let div_old = query(this.box).find('.w2ui-box')[0]
            let div_new = query(this.box).find('.w2ui-box-temp')[0]
            query(this.box).addClass('animating')
            w2utils.transition(div_old, div_new, options.transition, () => {
                // clean up
                query(div_old).remove()
                query(div_new).removeClass('w2ui-box-temp').addClass('w2ui-box')
                let $body = query(div_new).find('.w2ui-popup-body')
                if ($body.length == 1) {
                    $body[0].style.cssText = options.style
                    $body.show()
                }
                // focus on first button
                self.setFocus(options.focus)
                query(this.box).removeClass('animating')
            })
            // call event onOpen
            this.status = 'open'
            edata.finish()
            w2utils.bindEvents(query(this.box).find('.w2ui-eaction'), this)
            query(this.box).find('.w2ui-popup-body').show()
        }

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

        return prom

        // handlers
        function mvStart(evt) {
            if (!evt) evt = window.event
            self.status = 'moving'
            let rect = query(this.box).get(0).getBoundingClientRect()
            Object.assign(tmp, {
                resizing: true,
                isLocked: query(this.box).find('> .w2ui-lock').length == 1 ? true : false,
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
            query(this.box).css({
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
            query(this.box)
                .css({
                    'left': (tmp.pos_x + tmp.div_x) + 'px',
                    'top' : (tmp.pos_y + tmp.div_y) + 'px'
                })
                .css({
                    'transition': 'none',
                    'transform' : 'translate3d(0px, 0px, 0px)'
                })
            tmp.resizing = false
            query(document.body).off('.w2ui-popup')
            if (!tmp.isLocked) self.unlock()
        }
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
                        this.close()
                    }
                }
                break
        }
        // event after
        edata.finish()
    }

    destroy() {
        close(true)
    }

    close(immediate) {
        // trigger event
        let edata = this.trigger('close', { target: 'popup' })
        if (edata.isCancelled === true) return
        let cleanUp = () => {
            // return template
            query(this.box).remove()
            // restore active
            if (this.options._last_focus && this.options._last_focus.length > 0) this.options._last_focus.focus()
            this.status = 'closed'
            this.options = {}
            // event after
            edata.finish()
            this._promClosed()
        }
        if (query(this.box).length === 0 || this.status == 'closed') { // already closed
            return
        }
        if (this.status == 'opening') { // if it is opening
            immediate = true
        }
        if (this.status == 'closing' && immediate === true) {
            cleanUp()
            clearTimeout(this.tmp.closingTimer)
            w2utils.unlock(document.body, 0)
            return
        }
        // default behavior
        this.status = 'closing'
        query(this.box)
            .css('transition', this.options.speed + 's')
            .addClass('w2ui-anim-close animating')
        w2utils.unlock(document.body, 300)
        this._promClosing()

        if (immediate) {
            cleanUp()
        } else {
            this.tmp.closingTimer = setTimeout(cleanUp, this.options.speed * 1000)
        }
        // remove keyboard events
        if (this.options.keyboard) {
            query(document.body).off('keydown', this.keydown)
        }
        query(window).off('resize', this.handleResize)
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

    reset() {
        this.open(this.defaults)
    }

    message(options) {
        return w2utils.message({
            owner: this,
            box  : query(this.box).get(0),
            after: '.w2ui-popup-title'
        }, options)
    }

    confirm(options) {
        return w2utils.confirm({
            owner: this,
            box  : query(this.box),
            after: '.w2ui-popup-title'
        }, options)
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
