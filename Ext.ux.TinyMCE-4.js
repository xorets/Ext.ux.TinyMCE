/** ************************************************************
	Ext.ux.TinyMCE v4.0-b3
	ExtJS form field containing TinyMCE v4.0.x
	
	Author: Andrew Mayorov et al.
	http://blogs.byte-force.com/xor
	
	Copyright (c)2008-2011 BYTE-force
	www.byte-force.com
	
	License: LGPLv2.1 or later
*/

(function () {

	var tmceInitialized = false;

	// Lazy references to classes. To be filled in the initTinyMCE method.
	var WindowManager;
	var ControlManager;

	/** ----------------------------------------------------------
	Ext.ux.TinyMCE
	*/
	Ext.define("Ext.ux.TinyMCE", {

		extend: "Ext.form.field.Base",

		alias: ["widget.tinymce"],

		// TinyMCE Settings specified for this instance of the editor.
		tinymceSettings: null,

		// Validation properties
		allowBlank: true,
		invalidText: "The value in this field is invalid",
		invalidCls: "invalid-content-body",
		minLengthText: 'The minimum length for this field is {0}',
		maxLengthText: 'The maximum length for this field is {0}',
		blankText: 'This field is required',

		hideMode: 'offsets',
		ariaRole: 'textbox',

		// HTML markup for this field
		fieldSubTpl: [
			'<textarea id="{id}" style="visibility:hidden" ',
				'<tpl if="name">name="{name}" </tpl>',
				'<tpl if="size">size="{size}" </tpl>',
				'class="{fieldCls}" tabindex="-1">',
			'</textarea>',
			{
				compiled: true,
				disableFormats: true
			}
		],

		/** ----------------------------------------------------------
		*/
		constructor: function (cfg) {

			var config = {
				tinymceSettings: {
					accessibility_focus: false
				}
			};

			Ext.apply(config, cfg);

			// Add events
			this.addEvents({
				"editorcreated": true
			});

			this.callParent(arguments);
		},

		/** ----------------------------------------------------------
		*/
		initComponent: function () {
			this.callParent(arguments);

			this.tinymceSettings = this.tinymceSettings || {};
			Ext.ux.TinyMCE.initTinyMCE({ language: this.tinymceSettings.language });
		},

		/** ----------------------------------------------------------
		*/
		initEvents: function (fromPostRender) {

			// Do not execute if editor is not fully rendered yet.
			if (!fromPostRender)
				return;

			var editorBody = Ext.get(this.ed.getBody());

			onChangeTask = Ext.create('Ext.util.DelayedTask', this.checkChange, this);
			this.onChangeEvent = function () {
				onChangeTask.delay(this.checkChangeBuffer);
			};

			var fireChangeEvent = Ext.bind(function (ed, level) {
				this.fireEvent("change", this, level.content);
			}, this);

			this.ed.onChange.add(fireChangeEvent);
			this.ed.onUndo.add(fireChangeEvent);
			this.ed.onRedo.add(fireChangeEvent);

			this.ed.onKeyDown.add(
				Ext.bind(function (ed, e) {
					this.fireEvent("keydown", this, Ext.EventObject);
				}, this));

			this.ed.onKeyUp.add(
				Ext.bind(function (ed, e) {
					if (Ext.EventManager.getKeyEvent() == "keyup")
						this.fireKey();
					this.fireEvent("keyup", this, Ext.EventObject);
				}, this));

			this.ed.onKeyPress.add(
				Ext.bind(function (ed, e) {
					if (Ext.EventManager.getKeyEvent() == "keypress")
						this.fireKey();
					this.fireEvent("keypress", this, Ext.EventObject);
				}, this));


			this.mon(editorBody, "focus", this.onFocus, this);

			this.mon(editorBody, "blur", this.onBlur, this,
					 this.inEditor && Ext.isWindows && Ext.isGecko ? { buffer: 10} : null);
		},

		/** ----------------------------------------------------------
		*/
		onRender: function (ct, position) {
			var me = this;

			this.callParent(arguments);

			// Fix size if it was specified in config
			if (Ext.type(this.width) == "number") {
				this.tinymceSettings.width = this.width;
			}
			if (Ext.type(this.height) == "number") {
				this.tinymceSettings.height = this.height;
			}

			//this.el.dom.style.border = '0 none';
			this.el.dom.setAttribute('tabIndex', -1);

			// Create TinyMCE editor.
			this.ed = new tinymce.Editor(this.inputEl.id, this.tinymceSettings);

			// Set up editor events' handlers
			this.ed.onBeforeRenderUI.add(
				Ext.bind(function (ed, controlManager) {
					// Replace control manager
					ed.controlManager = new ControlManager(this, ed);
				}, this));

			this.ed.onPostRender.add(
				Ext.bind(function (ed, controlManager) {
					var s = ed.settings;

					// Modify markup.
					var tbar = Ext.get(Ext.DomQuery.selectNode("#" + this.ed.id + "_tbl td.mceToolbar"));
					if (tbar != null) {
						// If toolbar is present
						var tbars = tbar.select("table.mceToolbar");
						Ext.core.DomHelper
							.append(tbar,
								{ tag: "div", cls: "_tbar-wrap", style: { overflow: "hidden"} }
								, true)
							.appendChild(tbars);
					}

					// Change window manager
					ed.windowManager = new WindowManager({
						control: this,
						editor: this.ed,
						manager: this.manager
					});

					this.initEvents(true);

				}, this));

			// Set event handler on editor init.
			this.ed.onInit.add(
				Ext.bind(function () {
					// Peform the component resize after a short break, giving browser a chance to download toolbar images
					Ext.defer(function () {

						// Set layout manager and perform relayout
						if (me.tinymceSettings.theme == "advanced")
							me.setComponentLayout(Ext.create("Ext.ux.TinyMCE.AdvancedThemeLayout"));
						var size = me.getSize();

						me.doComponentLayout(size.width, size.height);

						// Indicate that editor is created
						me.fireEvent("editorcreated", me);

					}, 1);
				}, this));

			// Render the editor
			this.ed.render();

			// Remove inputEl
			delete this.inputEl;
		},

		/** ----------------------------------------------------------
		*/
		beforeDestroy: function () {
			if (this.ed) {
				this.ed.remove();
			}
			this.callParent(arguments);
		},

		/** ----------------------------------------------------------
		*/
		getRawValue: function () {

			if (!this.rendered || !this.ed.initialized)
				return Ext.value(this.value, '');

			var v = this.ed.getContent();
			if (v === this.emptyText) {
				v = '';
			}
			return v;
		},

		/** ----------------------------------------------------------
		*/
		setRawValue: function (v) {
			this.value = v;
			if (this.rendered)
				this.withEd(function () {
					this.ed.undoManager.clear();
					this.ed.setContent(v === null || v === undefined ? '' : v);
					this.ed.startContent = this.ed.getContent({ format: 'raw' });
				});
			this.callParent(arguments);
		},

		/** ----------------------------------------------------------
		*/
		getSubmitValue: function () {
			return this.getRawValue();
		},


		/** ----------------------------------------------------------
		*/
		isDirty: function () {
			if (this.disabled || !this.rendered) {
				return false;
			}
			return this.ed && this.ed.initialized && this.ed.isDirty();
		},

		/** ----------------------------------------------------------
		*/
		syncValue: function () {
			if (this.rendered && this.ed.initialized)
				this.ed.save();
		},

		/** ----------------------------------------------------------
		*/
		getEd: function () {
			return this.ed;
		},

		/** ----------------------------------------------------------
		*/
		onDisable: function () {
			this.setReadOnly(true);
			this.callParent(arguments);
		},

		/** ----------------------------------------------------------
		*/
		onEnable: function () {
			this.setReadOnly(false);
			this.callParent(arguments);
		},

		/** ----------------------------------------------------------
		*/
		setReadOnly: function (readonly) {
			this.withEd(function () {
				var bodyEl = this.ed.getBody();
				bodyEl = Ext.get(bodyEl);

				var hasCls, addCls;
				if (readonly) {
					hasCls = 'mceContentBody';
					addCls = 'mceNonEditable';
				}
				else {
					hasCls = 'mceNonEditable';
					addCls = 'mceContentBody';
				}

				if (bodyEl.hasCls(hasCls)) {
					bodyEl.removeCls(hasCls);
					bodyEl.addCls(addCls);
					this.ed.execCommand("mceRepaint");
					bodyEl.setAttribute('aria-readonly', readOnly);
				}
			});
			this.callParent(arguments);
		},

		/** ----------------------------------------------------------
		*/
		focus: function (selectText, delay) {
			if (delay) {
				Ext.defer(this.focus, (typeof delay == 'number' ? delay : 10), this, [selectText, false]);
				return;
			}

			this.withEd(function () {
				this.ed.focus();
				if (selectText === true)
					this.ed.selection.select(this.ed.getBody());
			});

			return this;
		},

		/** ----------------------------------------------------------
		*/
		onBlur: function () {
			if (!this.ed.getDoc())
				return;

			this.ed.undoManager.add();
			this.callParent(arguments);
		},

		/** ----------------------------------------------------------
		*/
		processRawValue: function (value) {
			return Ext.util.Format.stripTags(value);
		},

		/** ----------------------------------------------------------
		*/
		getErrors: function (value) {
			var me = this,
            errors = me.callParent(arguments),
            validator = me.validator,
            emptyText = me.emptyText,
            allowBlank = me.allowBlank,
            vtype = me.vtype,
            vtypes = Ext.form.field.VTypes,
            regex = me.regex,
            format = Ext.String.format,
            msg;

			value = value || me.processRawValue(me.getRawValue());

			if (Ext.isFunction(validator)) {
				msg = validator.call(me, value);
				if (msg !== true) {
					errors.push(msg);
				}
			}

			if (value.length < 1 || value === emptyText) {
				if (!allowBlank) {
					errors.push(me.blankText);
				}
				//if value is blank, there cannot be any additional errors
				return errors;
			}

			if (value.length < me.minLength) {
				errors.push(format(me.minLengthText, me.minLength));
			}

			if (value.length > me.maxLength) {
				errors.push(format(me.maxLengthText, me.maxLength));
			}

			if (vtype) {
				if (!vtypes[vtype](value, me)) {
					errors.push(me.vtypeText || vtypes[vtype + 'Text']);
				}
			}

			if (regex && !regex.test(value)) {
				errors.push(me.regexText || me.invalidText);
			}

			return errors;
		},

		/** ----------------------------------------------------------
		If ed (local editor instance) is already initilized, calls
		specified function directly. Otherwise - adds it to ed.onInit event.
		*/
		withEd: function (func) {

			// If editor is not created yet, reschedule this call.
			if (!this.ed) this.on(
				"editorcreated",
				function () { this.withEd(func); },
				this);

			// Else if editor is created and initialized
			else if (this.ed.initialized) func.call(this);

			// Else if editor is created but not initialized yet.
			else this.ed.onInit.add(
				Ext.bind(function () {
					Ext.defer(func, 10, this);
				}, this));
		},

		/** ----------------------------------------------------------
		internal
		Unbind blur and focus events coming from DOM node. Used while opening aux windows.
		*/
		_unbindBlurAndFocus: function () {
			//this.onBlur = Ext.emptyFn;
			/*this.mun( this.el, 'focus' );
			this.mun( this.el, 'blur' );*/
			Ext.util.Observable.capture(this, function () { return false; });
		},

		/** ----------------------------------------------------------
		internal
		Bind blur and focus events coming from DOM. Used to return back normal blur and focus opearaions.
		Code is copied from initEvents method.
		*/
		_bindBlurAndFocus: function () {
			this.ed.focus();
			Ext.util.Observable.releaseCapture(this);
		}

	});

	// Add static members
	Ext.apply(Ext.ux.TinyMCE, {

		/**
		Static field with all the plugins that should be loaded by TinyMCE.
		Should be set before first component would be created.
		@static
		*/
		tinymcePlugins: "pagebreak,style,layer,table,advhr,advimage,advlink,emotions,iespell,insertdatetime,preview,media,searchreplace,print,contextmenu,paste,directionality,noneditable,visualchars,nonbreaking,xhtmlxtras,template",

		/** ----------------------------------------------------------
		Inits TinyMCE and other necessary dependencies.
		*/
		initTinyMCE: function (settings) {
			if (!tmceInitialized) {

				// Create lazy classes
				/** ----------------------------------------------------------
				WindowManager
				*/
				WindowManager = Ext.define("Ext.ux.TinyMCE.WindowManager", {

					extend: "tinymce.WindowManager",

					// Reference to ExtJS control Ext.ux.TinyMCE.
					control: null,

					/** ----------------------------------------------------------
					Config parameters:
					control - reference to Ext.ux.TinyMCE control
					editor - reference to TinyMCE intstance.
					mangager - WindowGroup to use for the popup window. Could be empty.
					*/
					constructor: function (cfg) {
						WindowManager.superclass.constructor.call(this, cfg.editor);

						// Set reference to host control
						this.control = cfg.control;

						// Set window group
						this.manager = cfg.manager;
					},

					/** ----------------------------------------------------------
					*/
					alert: function (txt, cb, s) {
						Ext.MessageBox.alert("", this.editor.getLang(txt, txt), function () {
							if (!Ext.isEmpty(cb)) {
								cb.call(this);
							}
						}, s);
					},

					/** ----------------------------------------------------------
					*/
					confirm: function (txt, cb, s) {
						Ext.MessageBox.confirm("", this.editor.getLang(txt, txt), function (btn) {
							if (!Ext.isEmpty(cb)) {
								cb.call(this, btn == "yes");
							}
						}, s);
					},

					/** ----------------------------------------------------------
					*/
					open: function (s, p) {

						this.control._unbindBlurAndFocus();

						s = s || {};
						p = p || {};

						if (!s.type)
							this.bookmark = this.editor.selection.getBookmark('simple');

						s.width = parseInt(s.width || 320);
						s.height = parseInt(s.height || 240) + (tinymce.isIE ? 8 : 0);
						s.min_width = parseInt(s.min_width || 150);
						s.min_height = parseInt(s.min_height || 100);
						s.max_width = parseInt(s.max_width || 2000);
						s.max_height = parseInt(s.max_height || 2000);
						s.movable = true;
						s.resizable = true;
						p.mce_width = s.width;
						p.mce_height = s.height;
						p.mce_inline = true;

						this.features = s;
						this.params = p;

						var win = new Ext.Window(
						{
							title: s.name,
							width: s.width,
							height: s.height,
							minWidth: s.min_width,
							minHeight: s.min_height,
							resizable: true,
							maximizable: s.maximizable,
							minimizable: s.minimizable,
							modal: true,
							stateful: false,
							constrain: true,
							manager: this.manager,
							layout: "fit",
							items: [
								Ext.create("Ext.Component", {
									autoEl: {
										tag: 'iframe',
										src: s.url || s.file
									},
									style: 'border-width: 0px;'
								})
							],
							listeners: {
								beforeclose: function () {
									this.control._bindBlurAndFocus();
								},
								scope: this
							}
						});

						p.mce_window_id = win.getId();

						win.show(null,
							function () {
								if (s.left && s.top)
									win.setPagePosition(s.left, s.top);
								var pos = win.getPosition();
								s.left = pos[0];
								s.top = pos[1];
								this.onOpen.dispatch(this, s, p);
							},
							this
						);

						return win;
					},

					/** ----------------------------------------------------------
					*/
					close: function (win) {

						// Probably not inline
						if (!win.tinyMCEPopup || !win.tinyMCEPopup.id) {
							WindowManager.superclass.close.call(this, win);
							return;
						}

						var w = Ext.getCmp(win.tinyMCEPopup.id);
						if (w) {
							this.onClose.dispatch(this);
							w.close();
						}
					},

					/** ----------------------------------------------------------
					*/
					setTitle: function (win, ti) {

						// Probably not inline
						if (!win.tinyMCEPopup || !win.tinyMCEPopup.id) {
							WindowManager.superclass.setTitle.call(this, win, ti);
							return;
						}

						var w = Ext.getCmp(win.tinyMCEPopup.id);
						if (w) w.setTitle(ti);
					},

					/** ----------------------------------------------------------
					*/
					resizeBy: function (dw, dh, id) {

						var w = Ext.getCmp(id);
						if (w) {
							var size = w.getSize();
							w.setSize(size.width + dw, size.height + dh);
						}
					},

					/** ----------------------------------------------------------
					*/
					focus: function (id) {
						var w = Ext.getCmp(id);
						if (w) w.setActive(true);
					}

				});

				/** ----------------------------------------------------------
				ControlManager
				*/
				ControlManager = Ext.define("Ext.ux.TinyMCE.ControlManager", {

					extend: "tinymce.ControlManager",

					// Reference to ExtJS control Ext.ux.TinyMCE.
					control: null,

					/** ----------------------------------------------------------
					*/
					constructor: function (control, ed, s) {
						this.control = control;
						ControlManager.superclass.constructor.call(this, ed, s);
					},

					/** ----------------------------------------------------------
					*/
					createDropMenu: function (id, s) {
						// Call base method
						var res = ControlManager.superclass.createDropMenu.call(this, id, s);

						// Modify returned result
						var orig = res.showMenu;
						res.showMenu = function (x, y, px) {
							orig.call(this, x, y, px);
							Ext.fly('menu_' + this.id).setStyle("z-index", 200001);
						};

						return res;
					},

					/** ----------------------------------------------------------
					*/
					createColorSplitButton: function (id, s) {
						// Call base method
						var res = ControlManager.superclass.createColorSplitButton.call(this, id, s);

						// Modify returned result
						var orig = res.showMenu;
						res.showMenu = function (x, y, px) {
							orig.call(this, x, y, px);
							Ext.fly(this.id + '_menu').setStyle("z-index", 200001);
						};

						return res;
					}
				});

				// Init TinyMCE
				var s = {
					mode: "none",
					plugins: Ext.ux.TinyMCE.tinymcePlugins,
					theme: "advanced"
				};
				Ext.apply(s, settings);

				if (!tinymce.dom.Event.domLoaded)
					tinymce.dom.Event._pageInit();

				tinyMCE.init(s);
				tmceInitialized = true;
			}
		}
	});


	/** ----------------------------------------------------------
	Layout manager for adavanced theme of tinyMCE.
	*/
	Ext.define("Ext.ux.TinyMCE.AdvancedThemeLayout", {

		extend: "Ext.layout.component.field.Field",

		alias: [],

		/** ----------------------------------------------------------
		Checks if stylesheet with theme UI is not loaded yet. If the stylesheet is found
		then this method got rewritten with Ext.emtpyFn.
		*/
		styleSheetNotLoaded: function () {
			var stylesheets = document.styleSheets;
			if (stylesheets) {
				var ok = false;
				// Search for skin files
				for (var i = 0; i < stylesheets.length; i++) {
					var href = stylesheets[i].href;
					if (href && href.indexOf("themes/advanced/skins") != -1) {
						// Try to access css rules of the stylesheet. If it is not loaded, then it causes exception.
						try {
							var n = stylesheets[i].cssRules.length;
						} catch (e) {
							// Yes, it is not loaded yet.
							return true;
						}
						ok = true;
					}
				}
				if (ok) {
					this.styleSheetNotLoaded = Ext.emptyFn;
					return false;
				}
			}
			// Yes, it is not loaded yet.
			return true;
		},

		sizeBodyContents: function (width, height) {
			var owner = this.owner,
				bodyEl = owner.bodyEl;

			// Defer this call if stylesheet is not loaded yet.
			if (this.styleSheetNotLoaded()) {
				Ext.defer(arguments.callee, 100, this, arguments);
				return;
			}

			if (Ext.isNumber(width)) {
				width -= bodyEl.getFrameWidth('lr');
			}

			// If fixed height, subtract toolbar height from the input area height
			if (Ext.isNumber(height)) {
				height -= bodyEl.getFrameWidth('tb');
			}

			// Minimal width and height for advanced theme
			if (width < 100) width = 100;
			if (height < 129) height = 129;

			// Set toolbar div width
			var edTable = Ext.get(owner.ed.id + "_tbl"),
				edIframe = Ext.get(owner.ed.id + "_ifr"),
				edToolbar = edTable.select("._tbar-wrap").first();

			var toolbarWidth = width;
			if (edTable)
				toolbarWidth = width - 2;

			var toolbarHeight = 0;
			if (edToolbar) {
				var toolbarStrips = edToolbar.select("table.mceToolbar");
				toolbarHeight = toolbarStrips.getCount() * 26;

				var toolbarTd = edToolbar.findParent("td", 5, true);
				toolbarHeight += toolbarTd.getFrameWidth("tb");
				edToolbar.setWidth(toolbarWidth);
			}

			var edStatusbarTd = edTable.select(".mceStatusbar").first();
			var statusbarHeight = 0;
			if (edStatusbarTd) {
				statusbarHeight += edStatusbarTd.getHeight();
			}

			var iframeHeight = height - toolbarHeight - statusbarHeight;
			var iframeTd = edIframe.findParent("td", 5, true);
			if (iframeTd)
				iframeHeight -= iframeTd.getFrameWidth("tb");

			// Resize iframe and container
			edTable.setSize(toolbarWidth, height);
			edIframe.setSize(toolbarWidth, iframeHeight);
		}
	});

})();