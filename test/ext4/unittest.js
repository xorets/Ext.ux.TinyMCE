var tinymceSettings = {
	theme: "advanced",
	plugins: "pagebreak,style,layer,table,advhr,advimage,advlink,emotions,iespell,insertdatetime,preview,media,searchreplace,print,contextmenu,paste,directionality,noneditable,visualchars,nonbreaking,xhtmlxtras,template",
	theme_advanced_buttons1: "bold,italic,underline,strikethrough,|,justifyleft,justifycenter,justifyright,justifyfull,|,styleselect,formatselect,fontselect,fontsizeselect",
	theme_advanced_buttons2: "cut,copy,paste,pastetext,pasteword,|,search,replace,|,bullist,numlist,|,outdent,indent,blockquote,|,undo,redo,|,link,unlink,anchor,image,cleanup,help,code,|,insertdate,inserttime,preview,|,forecolor,backcolor",
	theme_advanced_buttons3: "tablecontrols,|,hr,removeformat,visualaid,|,sub,sup,|,charmap,emotions,iespell,media,advhr,|,print,|,ltr,rtl,|",
	theme_advanced_buttons4: "insertlayer,moveforward,movebackward,absolute,|,styleprops,|,cite,abbr,acronym,del,ins,attribs,|,visualchars,nonbreaking,template,pagebreak",
	theme_advanced_toolbar_location: "top",
	theme_advanced_toolbar_align: "left",
	theme_advanced_statusbar_location: "bottom",
	theme_advanced_resizing: false,
	extended_valid_elements: "a[name|href|target|title|onclick],img[class|src|border=0|alt|title|hspace|vspace|width|height|align|onmouseover|onmouseout|name],hr[class|width|size|noshade],font[face|size|color|style],span[class|align|style]",
	template_external_list_url: "example_template_list.js"
};

asyncTest("Create editor with certain size", 5, function () {

	var dlg = Ext.create("Ext.window.Window", {
		width: 600,
		height: 500,
		layout: "fit",
		items: [
		{
			xtype: "form",
			autoScroll: true,
			border: false,
			bodyBorder: false,
			items: [
			{
				id: "editor",
				xtype: "tinymce",
				height: 200,
				width: 300,
				tinymceSettings: tinymceSettings,
				listeners: {
					editorcreated: function (ed) {

						Ext.defer(function() {
							var size = ed.getSize();
							equal(size.width, 300, "Component width was set.");
							equal(size.height, 200, "Component height was set.");

							var edTable = ed.el.select("table.mceLayout");
							equal(edTable.getCount(), 1, "Table found.");

							var tableSize = edTable.first().getSize();
							equal(tableSize.width, 300, "Editor width was set.");
							equal(tableSize.height, 200, "Editor height was set.");

							// Delete the dialog
							Ext.defer(function() {
								dlg.destroy();
								start();
							}, 100);
						}, 100);
					}
				}
			}]
		}]
	});
	dlg.show();
});

asyncTest("Resize window and check that editor got resized.", 8, function () {

	var dlg = Ext.create("Ext.window.Window", {
		width: 600,
		height: 500,
		layout: "fit",
		items: [
		{
			id: "editor",
			xtype: "tinymce",
			tinymceSettings: tinymceSettings,
			listeners: {
				editorcreated: function (ed) {
					Ext.defer(function () {
						// Check that editor got initial size
						checkSize(ed, "Before resize. ");

						Ext.defer(function () {

							// Resize the window
							dlg.on("resize", onResize);
							dlg.setSize(500, 500);

							function onResize() {
								dlg.un("resize", onResize);
								checkSize(ed, "After resize. ");

								// Destroy the window
								Ext.defer(function () {
									dlg.destroy();
									start();
								}, 100);
							}
						}, 100 );
					}, 100);
				}
			}
		}]
	});
	dlg.show();

	function checkSize(ed, message) {
		var size = ed.getSize();

		var edTable = ed.el.select("table.mceLayout");
		var tableSize = edTable.first().getSize();

		var bodySize = dlg.body.getSize();

		equal(size.width, bodySize.width - 2, message + "Component width was set.");
		equal(size.height, bodySize.height - 2, message + "Component height was set.");

		equal(tableSize.width, bodySize.width - 2, message + "Table width was set.");
		equal(tableSize.height, bodySize.height - 2, message + "Table height was set.");
	}
});

asyncTest("Anchor layout", 2, function () {

	var dlg = Ext.create("Ext.window.Window", {
		width: 600,
		height: 500,
		bodyStyle: 'padding: 5px',
		layout: "anchor",
		items: [
		{
			id: "editor",
			xtype: "tinymce",
			fieldLabel: "Rich text",
			anchor: "100% -50",
			tinymceSettings: tinymceSettings,
			listeners: {
				editorcreated: function (ed) {

					var size = ed.bodyEl.getSize();

					var edTable = ed.el.select("table.mceLayout");

					var tableSize = edTable.first().getSize();
					equal(tableSize.width, size.width, "Editor width was set.");
					equal(tableSize.height, size.height, "Editor height was set.");

					// Delete the dialog
					Ext.defer(function () {
						dlg.destroy();
						start();
					}, 100);
				}
			}
		}]
	});
	dlg.show();
});

asyncTest("Focus and blur", 4, function () {

	var dlg = Ext.create("Ext.window.Window", {
		width: 600,
		height: 500,
		bodyStyle: 'padding: 5px',
		layout: "anchor",
		items: [
		{
			id: "editor",
			xtype: "tinymce",
			fieldLabel: "Rich text",
			anchor: "100%",
			tinymceSettings: tinymceSettings,
			listeners: {
				editorcreated: function (ed) {

					var focusCount = 0,
						blurCount = 0;

					var iframe = ed.ed.getBody();

					// Focus to the editor
					Ext.defer(function () {
						ed.on("focus", firstFocus);
						iframe.focus();
					}, 100);

					function firstFocus() {
						ed.un("focus", firstFocus);

						focusCount++;
						equal(focusCount, 1, "Editor got focus.");

						Ext.defer(function () {
							// Blur to a input field
							ed.on("blur", blurToTextField);
							dlg.down("[name='focusHere']").inputEl.dom.focus();
						}, 100);
					}

					function blurToTextField() {
						ed.un("blur", blurToTextField);

						blurCount++;
						equal(blurCount, 1, "Editor lost focus.");

						// Focus editor and insert table
						iframe.focus();
						ed.ed.execCommand("mceCodeEditor", true);
						findWindowAndProceed();
					}

					// Find the editor window
					function findWindowAndProceed() {
						var wins = Ext.ComponentQuery.query('window[title="HTML Source Editor"]');
						if (wins.length == 0) {
							Ext.defer(findWindowAndProceed, 100);
							return;
						}

						wins[0].close();

						equal(blurCount, 1, "No new blur.");
						equal(focusCount, 1, "No new focus.");

						// Delete the dialog
						Ext.defer(function () {
							dlg.destroy();
							start();
						}, 100);
					}
				}
			}
		},
		{
			xtype: "textfield",
			fieldLabel: "Blur here",
			name: "focusHere"
		}
		]
	});
	dlg.show();
});

asyncTest("Set focus from code", 2, function () {

	var dlg = Ext.create("Ext.window.Window", {
		width: 600,
		height: 500,
		bodyStyle: 'padding: 5px',
		layout: "anchor",
		items: [
		{
			id: "editor",
			xtype: "tinymce",
			fieldLabel: "Rich text",
			anchor: "100%",
			tinymceSettings: tinymceSettings,
			value: "<p>The value</p>",
			listeners: {
				editorcreated: function (ed) {

					var focusCount = 0,
						blurCount = 0;

					var iframe = ed.ed.getBody();

					// Focus to the editor
					Ext.defer(function () {
						ed.on("focus", firstFocus);
						ed.focus(true, 100);
					}, 100);

					// Continue anyway, even if event chain gets broken
					var timeoutTag = Ext.defer(function () {
						dlg.destroy();
						start();
					}, 1000);

					function firstFocus() {
						ed.un("focus", firstFocus);

						focusCount++;
						equal(focusCount, 1, "Editor got focus.");

						Ext.defer(function () {
							var value = ed.ed.selection.getContent();
							equal(value, "<p>The value</p>", "All text selected.");

							// Delete the dialog
							Ext.defer(function () {
								window.clearTimeout(timeoutTag);
								dlg.destroy();
								start();
							}, 100);
						}, 100);
					}
				}
			}
		},
		{
			xtype: "textfield",
			fieldLabel: "Blur here",
			name: "focusHere"
		}
		]
	});
	dlg.show();
});

asyncTest("Value test", 3, function () {

	var dlg = Ext.create("Ext.window.Window", {
		width: 600,
		height: 500,
		layout: "fit",
		items: [
		{
			xtype: "form",
			autoScroll: true,
			border: false,
			bodyBorder: false,
			items: [
			{
				id: "editor",
				xtype: "tinymce",
				height: 200,
				width: 300,
				tinymceSettings: tinymceSettings,
				value: "Initial value.",
				listeners: {
					editorcreated: function (ed) {

						// Check initial value
						equal(ed.originalValue, "Initial value.", "originalValue set correctly");

						var value = ed.getValue();
						equal(value, "Initial value.", "Initial value set correctly");

						// Change value
						ed.setValue("<p>New value</p>");
						value = ed.ed.getBody().innerHTML;
						equal(value, "<p>New value</p>", "Changed to new value");

						// Delete the dialog
						Ext.defer(function () {
							dlg.destroy();
							start();
						}, 100);
					}
				}
			}]
		}]
	});
	dlg.show();
});

asyncTest("Reset test", 2, function () {

	var dlg = Ext.create("Ext.window.Window", {
		width: 600,
		height: 500,
		layout: "fit",
		items: [
		{
			xtype: "form",
			autoScroll: true,
			border: false,
			bodyBorder: false,
			items: [
			{
				id: "editor",
				xtype: "tinymce",
				height: 200,
				width: 300,
				tinymceSettings: tinymceSettings,
				value: "Initial value.",
				listeners: {
					editorcreated: function (ed) {

						ed.setValue("New value");
						equal(ed.getValue(), "New value");

						ed.reset();
						value = ed.ed.getBody().innerHTML;
						equal(value, "<p>Initial value.</p>", "Correctly reset");

						// Delete the dialog
						Ext.defer(function () {
							dlg.destroy();
							start();
						}, 100);
					}
				}
			}]
		}]
	});
	dlg.show();
});
