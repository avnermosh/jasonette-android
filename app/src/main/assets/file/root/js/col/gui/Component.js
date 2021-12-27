'use strict';

import { COL } from  "../COL.js";

// /**
//  * COL.component namespace
//  * @namespace COL.component
//  */
COL.component = {};

COL.component.Component = function (html, flags) {
    var _flags = flags;
    var _this = this;
    this.$ = $(html);

    function init() {
        if(COL.util.isObjectInvalid(flags)) {
            _flags = {};
        }
    }

    this.flag = function (name, value) {

        //get                
        if(COL.util.isObjectInvalid(value)) {
            return _flags[name];
        }
        //set
        if (_flags[name]) {
            _flags[name] = value;
        } else {
            console.log("jQueryObject has not flag '" + name + "'");
        }
    };

    this.disabled = function (doDisable) {
        _this._disabled(doDisable);
    };

    this.isDisabled = function () {
        return _this._isDisabled();
    };

    $(window).ready(function () {
        _this._make();
    });

    init();
};

COL.component.Component.prototype = {
    _make: function () {
    },
    _disabled: function (doDisable) {
    }
};

// GRID ________________________________________________________________________

COL.component.Grid = function () {
    var $table = $('<div></div>')
        .css({
            display: "table",
            width: "100%"
        })
        .data("grid", true);

    var $row = $('<div></div>')
        .css({
            display: "table-row"
        });

    var $cell, arg;
    var w = 100 / arguments.length;
    var padding;
    for (var i = 0, m = arguments.length; i < m; i++) {
        arg = arguments[i];
        padding = ($(arg).data("grid")) ? 0 : "4px";
        $cell = $('<div></div>')
            .css({
                display: "table-cell",
                width: w + '%',
                padding: padding,
                verticalAlign: "middle"
            });

        if (arg instanceof COL.component.Component) {
            $cell.append(arg.$);
        } else {
            $cell.append(arg);
        }
        $row.append($cell);
    }

    return $table.append($row);

};

// Group _______________________________________________________________________

COL.component.Group = function (flags) {
    let _div1 = $('<div></div>');
    let _isDisabled = false;
    
    _div1.prop('id', flags.id);

    this.add = function () {
        for (var i = 0; i < arguments.length; i++) {
            if (arguments[i] instanceof COL.component.Component) {
                this.$.append(arguments[i].$);
            } else {
                console.error("The parameter must be an instance of COL.component.Component");
            }
        }
        return this;
    };

    this.isDisabled = function () {
        return _isDisabled;
    };
    
    this.enableGroupButtons = function () {
        let jqueryElement = this.$;
        let children = jqueryElement[0].children;
        
        // loop over the children and enable each of the children (assuming each child is a button)
        for (let i = 0; i < children.length; i++) {
            let child = children[i];
            let childJqueryObject1 = $(child);
            if(COL.doUseBootstrap)
            {
                // using bootstrap
                // convert from HTML Element to jQuery Element
                childJqueryObject1.button({disabled: false});
            }
            else
            {
                // using jquery-ui
                // convert from HTML Element to jQuery Element
                // childJqueryObject1.uibutton({disabled: false});
                childJqueryObject1.button({disabled: false});
            }
        }
        _isDisabled = false;
    };

    this.disableGroupButtons = function () {
        let jqueryElement = this.$;
        let children = jqueryElement[0].children;
        
        // loop over the children and disable each of the children (assuming each child is a button)
        for (let i = 0; i < children.length; i++) {
            let child = children[i];
            let childJqueryObject1 = $(child);

            if(COL.doUseBootstrap)
            {
                // using bootstrap
                // convert from HTML Element to jQuery Element
                childJqueryObject1.button({disabled: true});
            }
            else
            {
                // using jquery-ui
                // convert from HTML Element to jQuery Element
                // childJqueryObject1.uibutton({disabled: true});
                childJqueryObject1.button({disabled: true});
            }
        }
        _isDisabled = true;
    };
    
    COL.component.Component.call(this, _div1, flags);

};
COL.extend(COL.component.Component, COL.component.Group);

// Picture in Picture __________________________________________________________

COL.component.PiP = function (x, y) {

    if (!x) {
        x = 0;
    }

    if (!y) {
        y = 0;
    }

    var _html = $("<div></div>").css({
        position: "absolute",
        top: y,
        left: x
    });

    this.appendContent = function (content) {
        this.$.append(content);
        return this;
    };

    this.setX = function (value) {
        this.$.css("left", value);
        return this;
    };

    this.setY = function (value) {
        this.$.css("top", value);
        return this;
    };

    this.setVisible = function (visible) {
        if (visible) {
            this.$.show();
        } else {
            this.$.hide();
        }

        return this;
    };

    COL.component.Component.call(this, _html);
};

COL.extend(COL.component.Component, COL.component.PiP);

// BUTTON _____________________________________________________________________
COL.component.Button = function (flags) {
    var _html = '<button></button>';
    
    this.onClick = function (onClickFunction) {
        $(this.$.click(function (event) {
            onClickFunction(event);
        }));
    };

    this._make = function () {
        
	var right=this.flag("right");
        
	//the flag right is used to distinguish the operation buttons and the info buttons
        if(COL.util.isObjectValid(right)) {
            this.$.addClass("ui-button-right-align"); //add a css class to align the button to the extreme right
        }
	
        var label = this.flag("label");
        if(COL.util.isObjectValid(label)) {
            this.$.append(label);
        }

        let tooltipVal = this.flag("tooltip");
        if(COL.util.isObjectValid(tooltipVal)) {
            this.$.attr("title", tooltipVal).tooltip();
        }

        var img = this.flag("icon");
        // console.log('img', img); 

        this.$.append('<img src="' + img + '" />');


        var disabled = this.flag("disabled");
        this.$.button({disabled: disabled});
    };

    this._disabled = function (doDisable) {
        // console.log('BEG this._disabled');
        // console.log('doDisable', doDisable);
        
        // when disabling the component close the tooltip
        // since if it's open it will remain on screen indefinitely
        if(COL.doUseBootstrap)
        {
            // // using bootstrap
            // if (doDisable) this.$.tooltip("close");
            // this.$.button({disabled: doDisable});

            // disables the button (e.g. when hovering the hand is not shown and the button cannot be clicked on)
            this.$.attr("disabled", doDisable);

            if(doDisable)
            {
                // tints the button with grey to indicate that it is disabled
                this.$.addClass("ui-button-disabled");

                // hide the tooltip before disabling the button, so that the tooltip doesn't stay permanently
                // (note that when the button is disabled, the tooltip will not show when hovering over the button, until the button is enabled again)
                // (to show the tooltip, we would need a wrapper around the button... )
                // (see https://getbootstrap.com/docs/4.1/components/tooltips/#disabled-elements)
                this.$.tooltip('hide');
            }
            else
            {
                // removes the tint for button to indicate that it is enabled
                this.$.removeClass("ui-button-disabled");

                // this.$.tooltip('show');
            }
            // // indicates that the button is enabled/disabled
            // console.log('this.$[0].disabled', this.$[0].disabled);
        }
        else
        {
            // using jquery-ui
            // https://api.jqueryui.com/tooltip/#method-close
            // if (doDisable) this.$.uitooltip("close");
            if (doDisable) this.$.tooltip("close");
            // this.$.uibutton({disabled: doDisable});
            this.$.button({disabled: doDisable});
        }
    };

    this._isDisabled = function () {
        console.log('BEG this._isDisabled');
        let isDisabled1 = this.$.prop('disabled');
        console.log('isDisabled1', isDisabled1);
        
        return isDisabled1;
    };

    COL.component.Component.call(this, _html, flags);
};

COL.extend(COL.component.Component, COL.component.Button);

// FILE BUTTON _________________________________________________________________
COL.component.FileButton = function (flags) {
    COL.component.Button.call(this, flags);

    var _$file = $('<input type="file" />');
    this.$.prop('id', flags.id);

    if (this.flag("multiple")) {
        _$file.attr("multiple", "multiple");
    }

    //Enable click event
    this.$.click(function () {
        _$file.click();
    });

    this.onChange = function (onChangeFunction) {
        $(_$file.change(function () {
            // console.log('BEG this.onChange');
            
            onChangeFunction(this);

            // hack to clear the input form, otherwise the same file cannot
            // be loaded a second time because the change event won't be triggered
            _$file.wrap('<form>').closest('form').get(0).reset();
            _$file.unwrap();
            event.preventDefault();
        }));
    };
};

COL.extend(COL.component.Button, COL.component.FileButton);

// TOGGLE BUTTON _______________________________________________________________
COL.component.ToggleButton = function (flags) {
    if (flags.on !== true && flags.on !== false) {
        console.log("Warning(COL.component.TogggleButton): forcing flags.on to false");
        flags.on = false;
    }
    COL.component.Button.call(this, flags);
    this.$.prop('id', flags.id);

    var _this = this;
    var _on = this.flag("on");
    var _toggleCallback = null;

    /* NOTE: the callback specified with onToggle() is not called if the 'ev' 
       parameter is omitted */
    this.toggle = function (param, ev) {
        switch (param) {
            case "on":
                _on = true;
                break;
            case "off":
                _on = false;
                break;
            default: // just toggle it
                _on = !_on;
        }

        if (_on) {
            _this.$.addClass("col-toggle-on");
        } else {
            _this.$.removeClass("col-toggle-on");
        }
        if (COL.util.isObjectValid(ev) && _toggleCallback) {
            _toggleCallback(_on === true, ev);
        }
    };

    this.onToggle = function (onToggleFunction) {
        _toggleCallback = onToggleFunction;
    };

    this.isOn = function () {
        return _on === true;
    };

    this.$.click(function (event) {
        _this.toggle(null, event);
    });
};

COL.extend(COL.component.Button, COL.component.ToggleButton);


// CUSTOM TOGGLE BUTTON ________________________________________________________

COL.component.CustomToggleButton = function (flags) {
    var _html = $('<div/>').addClass("col-custom-toggle-button");

    var _$arrow = $('<div/>').addClass("col-custom-toggle-button-arrow");

    var _arrowHandler = null;

    var _toggle = new COL.component.ToggleButton(flags);

    this.toggle = function (param, event) {
        _toggle.toggle(param, event);
    };

    this.isOn = function () {
        return _toggle.isOn();
    };

    this.onToggle = function (onToggleFunction) {
        _toggle.onToggle(function (on,event) {
            onToggleFunction(on,event);
        });
    };

    this.onRightButtonClicked = function (onRightButtonClickedFunction) {
        _toggle.$.mouseup(function (event) {
            if (event.which === 3) {
                onRightButtonClickedFunction(event);
            }
        });
    };

    this.onArrowClicked = function (onArrowClickedFunction) {
        _arrowHandler = onArrowClickedFunction;
        _$arrow.click(function () {
            onArrowClickedFunction();
        });
    };
    
    this.setArrowSelected = function(selected) {
        if(selected === true) {
            _$arrow.addClass("arrow-selected");
        } else {
            _$arrow.removeClass("arrow-selected");
        }
    };

    this.isArrowSelected = function () {
        return _$arrow.hasClass("arrow-selected");
    };
    
    this._make = function () {
        this.$.append(_toggle.$, _$arrow);
    };

    this._disabled = function (disabled) {
        _toggle._disabled(disabled);

        if (disabled) {
            _$arrow.css("opacity", "0.2");
            _$arrow.off();
        } else {
            _$arrow.css("opacity", "1");
            _$arrow.click(_arrowHandler);
        }
    };

    COL.component.Component.call(this, _html, flags);

};

COL.extend(COL.component.Component, COL.component.CustomToggleButton);

// CHECKBOX ____________________________________________________________________

COL.component.CheckBox = function (checked) {
    var _html = '<input type="checkbox" />';

    this._make = function () {
        if (jQuery.type(checked) !== "boolean") {
            checked = false;
        }

        this.setValue(checked);
    };

    this.onChange = function (onChangeFunction) {
        this.$.change(function (event) {
            onChangeFunction(event);
        });
    };


    this.isChecked = function () {
        return this.$.prop('checked');
    };

    this.setValue = function (boolean) {
        if (jQuery.type(boolean) !== "boolean") {
            boolean = false;
        }
        this.$.prop("checked", boolean);
    };

    COL.component.Component.call(this, _html);
};

COL.extend(COL.component.Component, COL.component.CheckBox);

// TEXT FIELD __________________________________________________________________
COL.component.TextField = function (txt) {
    var _html = $('<input type="text" class="col-text-field"/>')
        .attr("value", txt);

    var _this = this;
    this._disabled = function () {
        _this.$.attr("disabled", "disabled");
    };

    this.onChange = function (callback) {
        _html.on("change", function( event ) {             
            _html.attr("value",this["value"]);
        });
    };
    
    this.getValue = function () {
        return  _html.attr("value");
    };

    this.setValue = function (value) {
        _$editText.val(value);
    };
    COL.component.Component.call(this, _html);
};

COL.extend(COL.component.Button, COL.component.TextField);

// ButtonSet __________________________________________________________________

COL.component.ButtonSet = function (flags) {
    var _html = '<div></div>';
    var _this = this;

    this._make = function () {
        var options = _this.flag("options");

        _this.$.uniqueId();
        var groupId = this.$.attr("id");

        var $input, $label, uId;
        $(options).each(function (key, option) {
            $input = $('<input type="radio"/>')
            //                    .attr("id", option.value)
                .attr("name", groupId)
                .data("value", option.value);


            $input.uniqueId();
            uId = $input.attr("id");

            $label = $('<label for="' + uId + '"></label>')
                .append(option.content);

            if (option.selected === true) {
                $input.attr("checked", "checked");
            }

            _this.$.append($input, $label);

        });

        _this.$.buttonset();

    };

    this.getSelectedContent = function () {
        var id = this.$.find(":checked").attr("id");
        return $("[for=" + id + "]").find("span").text();
    };

    this.getSelectedValue = function () {
        return this.$.find(":checked").data("value");
    };

    this.selectByValue = function (value) {
        this.$.find(":input").each(function (key, element) {
            if ($(element).data("value") === value) {
                $(element).prop('checked', true).button('refresh');
            }
        });
    };

    this.onChange = function (onChangeFunction) {
        _this.$.find(":input").change(function () {
            onChangeFunction($(this).data("value"));
        });
    };

    COL.component.Component.call(this, _html, flags);
};

COL.extend(COL.component.Component, COL.component.ButtonSet);

// Combobox ____________________________________________________________________

COL.component.ComboBox = function (flags) {
    var _html = '<select></select>';
    // let _html = $('<select></select>');
    // _html.prop('id', flags.id);

    var _this = this;


    this._make = function () {
        var options = _this.flag("options");

        $(options).each(function (key, option) {
            var $option = $("<option/>")
                .attr("value", option.value)
                .append(option.content);
            if (option.selected === true) {
                $option.attr("selected", "selected");
            }
            _this.$.append($option);
        });

        // _this.$.selectmenu({width: "100%"});
        _this.$.selectmenu({width: "30%"});
        _this.$.selectmenu("menuWidget");
        // _this.$.addClass("overflow");
        // _this.$.addClass("combobox1");
        // _this.$.selectmenu({display: "block !important"});
    };

    this.disabled = function (bool) {
        // ui-id-1-button
        // _this._disabled(doDisable);

        if(COL.doUseBootstrap)
        {
            // using bootstrap
            let jqueryElement = this.$;
            jqueryElement.attr("disabled", bool);
        }
        else
        {
            // using jquery-ui
            let jqueryElement = this.$;
            // jqueryElement.uibutton({disabled: bool});
            jqueryElement.button({disabled: bool});
        }
    };

    this.getSelectedContent = function () {
        return this.$.find(":selected").text();
    };

    this.getSelectedValue = function () {
        return this.$.find(":selected").val();
    };

    this.selectByValue = function (value) {
        _this.$.find("option[value=" + value + "]").prop('selected', true);
        _this.$.selectmenu('refresh');
    };

    this.onChange = function (onChangeFunction) {
        _this.$.on("selectmenuchange", function (event, ui) {
            onChangeFunction(event, ui);
        });
    };

    COL.component.Component.call(this, _html, flags);
};

COL.extend(COL.component.Component, COL.component.ComboBox);

// Tool Bar ____________________________________________________________________

COL.component.ToolBar = function () {
    var _html = $('<div class="mjs-scenebar-class"></div>');

    this.add = function () {
        for (var i = 0; i < arguments.length; i++) {
            if (arguments[i] instanceof COL.component.Component) {
                this.$.append(arguments[i].$);
            } else {
                console.error("The parameter must be an instance of COL.component.Component");
            }
        }
        return this;
    };

    COL.component.Component.call(this, _html);
};

COL.extend(COL.component.Component, COL.component.ToolBar);

// Pane ________________________________________________________________________

COL.component.Pane = function () {

    var _html = '<div class="col-pane ui-widget-content"></div>';

    this._make = function () {

        this.$.css({
            height: "100%",
            width: "100%",
            // object-fit: "contain",
            // background-size: "contain",
            overflow: "auto"
        });
    };

    this.appendContent = function () {
        for (var i = 0; i < arguments.length; i++) {
            if (arguments[i] instanceof COL.component.Component) {
                this.$.append(arguments[i].$);
            } else {
                this.$.append(arguments[i]);
            }
        }
        return this;
    };

    COL.component.Component.call(this, _html);

};

COL.extend(COL.component.Component, COL.component.Pane);

// LABEL _______________________________________________________________________
COL.component.Label = function (flags) {
    var _html = "<label></label>";
    this._make = function () {

        this.$.prop('id', flags.id);
        
        var label = this.flag("label");
        if(COL.util.isObjectInvalid(label)) {
            label = "Label";
        }
        this.$.append(label);

        var tooltipVal = this.flag("tooltip");
        if(COL.util.isObjectValid(tooltipVal)) {
            this.$.attr("title", tooltipVal);

            this.$.tooltip({
                content: function () {
                    return $(this).prop('title');
                }
            });
        }
    };

    COL.component.Component.call(this, _html, flags);

};

COL.extend(COL.component.Component, COL.component.Label);

// ACCORDION ___________________________________________________________________
COL.component.Accordion = function (flags) {
    var _html = "<div></div>";
    this.addEntry = function () {
        var entry;
        for (var i = 0, m = arguments.length; i < m; i++) {
            entry = arguments[i];
            if (!(entry instanceof COL.component.AccordionEntry)) {
                console.error("The parameter must be an AccordionEntry instance.");
            } else {
                this.$.append(entry.$title).append(entry.$content);
            }
        }

        return this;
    };
    this._make = function () {
        this.$.accordion(flags);
    };

    this.getActiveInfo = function () {
        var active = this.$.accordion("option", "active");
        var text = this.$.find("h3").eq(active).text();

        return {index: active, header: text};
    };

    this.refresh = function () {
        this.$.accordion({active: false}).accordion("refresh");
    };
    
    this._disabled = function (disabled) {
        if(disabled) {
            this.$.accordion("disable");
        } else {
            this.$.accordion("enable");
        }
        
    };
    
    COL.component.Component.call(this, _html);

};

COL.extend(COL.component.Component, COL.component.Accordion);

COL.component.AccordionEntry = function (flags) {
    this.$title = $('<h3></h3>').css("position", "relative");
    
    this.$content = $('<div></div>');
    var _$headerWrapp = $("<div></div>").css({display: "table", width: "100%"});
    
    var _$label = new COL.component.Label(flags);
    var _$title = $('<div/>').append(_$label.$).css({display: "table-cell"});
    
    var _$btnWrapp = $('<div></div>').css({display: "table-cell", textAlign: "right"});
    
    _$headerWrapp.append(_$title, _$btnWrapp);
    this.$title.append(_$headerWrapp);

    this.show = function () {
        this.$title.show();
        this.$content.show();
    };

    this.hide = function () {
        this.$title.hide();
        this.$content.hide();
    };

    this.appendContent = function () {
        var content;
        for (var i = 0, m = arguments.length; i < m; i++) {
            content = arguments[i];
            if (content instanceof COL.component.Component) {
                this.$content.append(content.$);
            } else {
                this.$content.append(content);
            }
        }

        return this;
    };

    
    // // tbd - remove - the function is it being used ???
    // this.addHeaderButton = function () {
    //     var button;
    //     for (var i = 0, m = arguments.length; i < m; i++) {
    //         button = arguments[i];
    //         if (!(button instanceof COL.component.Button)) {
    //             console.error("The parameter must be a COL.component.Button instance");
    //         } else {
    //             _$btnWrapp.append(button.$);
    //             button.onClick(function (event) {
    //                 // tbd - remove - it is recommended to NOT use stopPropagation()
    //                 event.stopPropagation();
    //             });
    //         }
    //     }
    //     return this;
    // };

};

// SPINNER _____________________________________________________________________
COL.component.Spinner = function (flags) {
    var _html = '<div></div>';
    var _$spinner = $('<input>').css({width: "100%"});

    var _this = this;

    this.onChange = function (callback) {
        _$spinner.on("spinchange", function (event, ui) {
            if (_this.getValue() == "" || isNaN(_this.getValue())) {
                console.warn('Warning(Spinner): value is not a number, reset to default');
                _this.setValue(_this.flag("defval"));
            }
            callback(event, ui);
        });
    };

    this.onSpin = function (callback) {
        _$spinner.on("spin", function (event, ui) {
            callback(event, ui);
        });
    };

    this.onSpinStop = function (callback) {
        _$spinner.on("spinstop", function (event, ui) {
            callback(event, ui);
        });
    };

    this.getValue = function () {
        return _$spinner.val();
    };

    this.setValue = function (value) {
        _$spinner.val(value);
    };

    this._make = function () {
        this.$.append(_$spinner);

        var defval = this.flag("defval");
        if (defval) {
            _$spinner.attr("value", defval);
        }

        _$spinner.spinner(flags);
    };

    COL.component.Component.call(this, _html, flags);
};

COL.extend(COL.component.Component, COL.component.Spinner);

COL.component.RangedFloat = function (flags) {
    //local variable for the input parameters
    var _this = this, inputparams;
    //create root
    var _html = $('<div>').css({position: "relative", float: "left", clear: "none", width: "100%"});
    //create slider node
    var _$slider = $('<div>').css({width: "50%", position: "relative", left: "0px", top: "10px"});
    //create label of min max
    var _pmin = $('<p>').css({fontSize: '50%', position: "absolute", left: "0px"});
    var _pmax = $('<p>').css({fontSize: '50%', position: "absolute", left: "49%"});
    //edit text node
    var _$editText = $('<input>')
        .css({width: "30%", position: "relative", textAlign: "right", left: "58%", bottom: "8px"});        
    //init function
    this._make = function () {
        //extract parameters
        var minval = this.flag("min");
        var maxval = this.flag("max");
        var defval = this.flag("defval");
        var stepval = this.flag("step");
        //check & assignment
        inputparams = {
            minvalue: (minval !== undefined ? minval : 0),
            maxvalue: (maxval !== undefined ? maxval : 100),
            defvalue: (defval !== undefined ? defval : 50),
            stepvalue: (stepval !== undefined ? stepval : 0.01)
        };
        //insert the labels html code
        _pmin.html(inputparams.minvalue);
        _pmax.html(inputparams.maxvalue);
        //append the labels
        this.$.append(_pmin);
        this.$.append(_pmax);
        //append the slider to the root
        this.$.append(_$slider);
        //append the edit text to the root
        this.$.append(_$editText);
        //slider initialization
        _$slider.slider({
            min: inputparams.minvalue,
            max: inputparams.maxvalue,
            step: inputparams.stepvalue,
            value: inputparams.defvalue,
            //onCreate event callback
            create: function (event, ui) {
                _$editText.val(inputparams.defvalue);
            }
        });
    };

    this.getValue = function () {
        return _$editText.val();
    };

    this.setValue = function (value) {
        _$editText.val(value);
        _$slider.slider('value', value);
    };

    this.onChange = function (onChangeFunction) {
        _$slider.on( "slide", function( event, ui ) {
            //call rangedfloat's setValue method
            _this.setValue(ui.value);
            onChangeFunction(event,ui);
        });
        _$editText.on("change", function( event ) {
            //take inserted value
            var val = _this.getValue();
            //validation pattern
            var pattern = /^([-+]?\d+(\.\d+)?)/;
            //trunk in groups the string
            val = val.match(pattern);
            val = (val ? val[0] : null);
            //take the larger part of the inserted value matching the pattern
            if (val == null || !pattern.test(val)) {
                console.error('Invalid input, reset to default value');
                val = inputparams.defvalue; //if not correct, assign the default value
            }
            //take the boundaries
            var min = _$slider.slider("option", "min");
            var max = _$slider.slider("option", "max");
            //validate the boundaries
            if (val > max)
                val = max;
            else if (val < min)
                val = min;
            //call rangedfloat's setValue method
            _this.setValue(val);
            //var needed by onChangeFunction
            var ui = { value : val };
            onChangeFunction(event,ui);
        });
    };

    COL.component.Component.call(this, _html, flags);
};

COL.extend(COL.component.Component, COL.component.RangedFloat);


// DIALOG ______________________________________________________________________
COL.component.Dialog = function (flags) {
    var _html = "<div></div>";
    var _this = this;
    
    this.appendContent = function (content) {        
        _this.$.append(content);
        return this;
    };
    
    this._make = function () {
        _this.$.hide();
        $('body').append(_html);
    };

    this.show = function() {        
        _this.$.dialog(flags);
    }
    
    this.hide = function() {        
        _this.$.dialog("close");
    }
    
    this.destroy = function() {
        _this.$.dialog("destroy");
    }
    
    COL.component.Component.call(this, _html);

};

COL.extend(COL.component.Component, COL.component.Dialog);

/**         
 * @class Layer selection component, rendered as a ComboBox menu.
 * @param {flags} flags
 * @memberOf COL.component
 */
COL.component.LayerSelection = function(flags) {
    var _html = "<select></select>";
    var _this = this;

    $(document).on("SceneLayerAdded", function(event, layer) {
        if (_this.$.find("option").length === 0) {
            _this.$.selectmenu("enable");
        }
        var $option = $("<option />").attr("value", layer.name).append(layer.name);
        _this.$.append($option);
        _this.$.selectmenu("refresh");
    });

    this._make = function() {
        _this.$.selectmenu({width: "100%", disabled: true})
            .selectmenu("menuWidget")
            .addClass("overflow");
    };

    this.getSelectedEntry = function() {
        return _this.$.find(":selected").val();
    };

    COL.component.Component.call(this, _html, flags);
};

COL.extend(COL.component.Component, COL.component.LayerSelection);
