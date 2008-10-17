VyattaNodeUI = Ext.extend(Ext.tree.TreeNodeUI, {
  getNodeStyle: function(node) {
    if (node.attributes.configured == undefined) {
      return ' class="v-node-nocfg" style="color:black;"';
    } else if (node.attributes.configured == 'active') {
      return ' class="v-node-active" style="color:black;"';
    } else if (node.attributes.configured == 'set') {
      return ' class="v-node-set" style="color:green;"';
    } else if (node.attributes.configured == 'delete') {
      return ' class="v-node-delete" style="color:red;"';
    }
    return '';
  },

  renderElements: function(n, a, targetNode, bulkRender) {
    this.indentMarkup = n.parentNode ? n.parentNode.ui.getChildIndent() : '';
    var cb = typeof a.checked == 'boolean';
    var href = a.href ? a.href : Ext.isGecko ? "" : "#";
    var styleStr = this.getNodeStyle(n);
    var buf = [
      '<li class="x-tree-node"><div ext:tree-node-id="', n.id,
      '" class="x-tree-node-el x-tree-node-leaf x-unselectable ', a.cls,
      '" unselectable="on">',
      '<span class="x-tree-node-indent">', this.indentMarkup, "</span>",
      '<img src="', this.emptyIcon, '" class="x-tree-ec-icon x-tree-elbow" />',
      '<img src="', a.icon || this.emptyIcon, '" class="x-tree-node-icon',
      (a.icon ? " x-tree-node-inline-icon" : ""),
      (a.iconCls ? " "+a.iconCls : ""),'" unselectable="on" />',
      cb ? ('<input class="x-tree-node-cb" type="checkbox" '
            + (a.checked ? 'checked="checked" />' : '/>')) : '',
      '<a hidefocus="on" class="x-tree-node-anchor" href="', href,
      '" tabIndex="1" ',
      a.hrefTarget ? ' target="'+a.hrefTarget+'"' : "",
      '><span unselectable="on"' + styleStr + '>', n.text,
      "</span></a></div>",
      '<ul class="x-tree-node-ct" style="display:none;"></ul>', "</li>"
    ].join('');

    var nel;
    if(bulkRender !== true && n.nextSibling
       && (nel = n.nextSibling.ui.getEl())){
      this.wrap = Ext.DomHelper.insertHtml("beforeBegin", nel, buf);
    } else {
      this.wrap = Ext.DomHelper.insertHtml("beforeEnd", targetNode, buf);
    }
    this.elNode = this.wrap.childNodes[0];
    this.ctNode = this.wrap.childNodes[1];
    var cs = this.elNode.childNodes;
    this.indentNode = cs[0];
    this.ecNode = cs[1];
    this.iconNode = cs[2];
    var index = 3;
    if(cb){
      this.checkbox = cs[3];
      // fix for IE6
      this.checkbox.defaultChecked = this.checkbox.checked;
      index++;
    }
    this.anchor = cs[index];
    this.textNode = cs[index].firstChild;
  }
});

Ext.onReady(function(){
    var cookieP = new Ext.state.CookieProvider({
      expires: new Date(new Date().getTime() + (15 * 60 * 1000))
    });
    Ext.state.Manager.setProvider(cookieP);

    var userField = new Ext.form.TextField({
      fieldLabel: 'User name',
      labelSeparator: '',
      width: 200,
      inputType: 'text'
    });
    var passField = new Ext.form.TextField({
      fieldLabel: 'Password',
      labelSeparator: '',
      width: 200,
      inputType: 'password'
    });
    var loginHandler = function() {
      var authCb = function(options, success, response) {
        var xmlRoot = response.responseXML.documentElement;
        var q = Ext.DomQuery;
        var id = q.selectValue('id', xmlRoot, 'NOTFOUND');
        cookieP.set('id', id);
        loginWin.hide();
        if (id == 'NOTFOUND') {
          Ext.MessageBox.alert('Login', 'Login failed');
        }
      }
      var xmlstr = "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n"
                   + '<vyatta><auth><user>'
                   + userField.getValue()
                   + "</user>\n"
                   + '<pswd>'
                   + passField.getValue()
                   + "</pswd></auth></vyatta>\n";
      var conn = new Ext.data.Connection({});
      conn.request({
        url: '/cgi-bin/webgui-wrap', method: 'POST',
        xmlData: xmlstr,
        callback: authCb
      });
    }
    var loginWin = new Ext.Window({
      buttons: [
        new Ext.Button({
          text: 'Login',
          handler: loginHandler
        })
      ],
      bodyStyle: 'padding:10px',
      layout: 'form',
      layoutConfig: { },
      items: [ userField, passField ],
      closeAction: 'hide',
      constrain: 'true',
      height: 150,
      width: 350,
      modal: true,
      resizable: false,
      title: 'Please login'
    });

    var getSessionId = function() {
      var sid = cookieP.get('id', 'NOTFOUND');
      if (sid == 'NOTFOUND') {
        if (tree != undefined) {
          tree.root.collapse();
        }
        if (editor != undefined) {
          clearEditor();
        }
        loginWin.show();
      }
      return sid;
    }
    getSessionId();

    var editor = new Ext.Panel({
      title: 'Edit',
      region: 'center',
      split: true,
      margins: '5 5 5 0',
      bodyStyle: 'padding:10px',
      border: true,
      autoScroll: true,
      collapsible: false,
      tbar: [
        new Ext.Button({
          text: 'Commit',
          handler: function(){
            sendCommandCli([ 'commit' ], null);
          }
        }),
        new Ext.Button({
          text: 'Discard',
          handler: function(){
            sendCommandCli([ 'discard' ], null);
          }
        })
      ]
    });

    var jsonGenNode = function(node, nn) {
      if (nn == 'node.tag') {
        nn = '&lt;value&gt;';
      }
      var str = "{text:'" + nn + "',uiProvider:'node'";
      var q = Ext.DomQuery;
      var nLeaf = q.selectNode('terminal', node);
      if (nLeaf != undefined) {
        str += ",leaf:true";
        var nvals = q.select('value', nLeaf);
        if (nvals.length > 0) {
          var vstr = '';
          for (var i = 0; i < nvals.length; i++) {
            var cfgd = q.selectValue('configured', nvals[i], 'NONE');
            if (cfgd == 'active' || cfgd == 'set') {
              if (vstr != '') {
                vstr += ',';
              }
              vstr += "'" + nvals[i].getAttribute('name') + "'";
            }
          }
          str += ",values:[ " + vstr + " ]";
        }
      }
      var nType = q.selectNode('type', node);
      if (nType != undefined) {
        str += ",type:'" + nType.getAttribute('name') + "'";
      }
      var nMulti = q.selectNode('multi', node);
      if (nMulti != undefined) {
        str += ",multi:true";
      }
      var tHelp = q.selectValue('help', node);
      if (tHelp != undefined) {
        tHelp = tHelp.replace(/'/g, "\\'", 'g');
        str += ",help:'" + tHelp + "'";
      }
      var tConfig = q.selectValue('configured', node);
      if (tConfig != undefined) {
        str += ",configured:'" + tConfig + "'";
      }
      var nenums = q.selectNode('enum', node);
      if (nenums != undefined) {
        var enums = q.select('match', nenums);
        var vstr = '';
        for (var i = 1; i <= enums.length; i++) {
          if (vstr != '') {
            vstr += ',';
          }
          vstr += "'" + q.selectValue('match:nth(' + i + ')', nenums) + "'";
        }
        str += ",enums:[ " + vstr + " ]";
      }
      str += "}";
      return str;
    }

    MyTreeLoader = Ext.extend(Ext.tree.TreeLoader, {
      requestData: function(node, callback) {
        var sid = getSessionId();
        if (sid == 'NOTFOUND') {
          // no sid. do nothing.
          if (typeof callback == "function") {
              callback();
          }
          return;
        }
        if(this.fireEvent("beforeload", this, node, callback) !== false){
            var cstr = "<vyatta><configuration><id>";
            if (this.isOpMode) {
              cstr = "<vyatta><configuration mode='op'><id>";
            }
            var xmlstr = "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n"
                         + cstr + sid + "</id>\n"
                         + "<node>" + this.baseParams.nodepath + "</node>\n"
                         + "</configuration></vyatta>\n";
            this.transId = Ext.Ajax.request({
                method:this.requestMethod,
                url: this.dataUrl||this.url,
                success: this.handleResponse,
                failure: this.handleFailure,
                scope: this,
                argument: {callback: callback, node: node},
                //params: this.baseParams
                xmlData: xmlstr
            });
        }else{
            // if the load is cancelled, make sure we notify
            // the node that we are done
            if(typeof callback == "function"){
                callback();
            }
        }
      },
      processResponse: function(response, node, callback) {
        var xmlRoot = response.responseXML.documentElement;
        var q = Ext.DomQuery;
        var nodes = q.select('node', xmlRoot);
        if (nodes.length == 0) {
          response.responseText
            = '[ ]';
          return MyTreeLoader.superclass.processResponse.apply(this,
                                                               arguments);
        }
        var str = '';
        for (var i = 0; i < nodes.length; i++) {
          if (str != '') {
            str += ',';
          }
          str += jsonGenNode(nodes[i], nodes[i].getAttribute('name'));
        }
        response.responseText = '[' + str + ']';
        MyTreeLoader.superclass.processResponse.apply(this, arguments);
      }
    });

    var tree = new Ext.tree.TreePanel({
        border: true,
        autoScroll: true,
        title: 'Configuration',
        pathSeparator: ' ',
       
        loader: new MyTreeLoader({
            clearOnLoad: true,
            requestMethod: 'POST',
            dataUrl: '/cgi-bin/webgui-wrap',
            uiProviders:{
                'node': VyattaNodeUI
            }
        }),

        rootVisible: false,
        root: new Ext.tree.AsyncTreeNode({
          id: 'root',
          cls: 'v-node-active',
          text: 'Configuration'
        })
    });

    var otree = new Ext.tree.TreePanel({
        border: true,
        autoScroll: true,
        title: 'Operation',
        pathSeparator: ' ',
       
        loader: new MyTreeLoader({
            clearOnLoad: true,
            requestMethod: 'POST',
            dataUrl: '/cgi-bin/webgui-wrap',
            uiProviders:{
                'node': VyattaNodeUI
            }
        }),

        rootVisible: false,
        root: new Ext.tree.AsyncTreeNode({
          id: 'root',
          cls: 'v-node-active',
          text: 'Operation'
        })
    });

    var clearEditor = function() {
      editor.opVal = undefined;
      if (editor.items != undefined) {
        while (editor.items.getCount() > 0) {
          editor.remove(editor.items.itemAt(0));
        }
      }
    }
    
    var leafSingleTxtHandler = function(node, hlabel, buttons) {
      var ival = undefined;
      if (node.attributes.values != undefined) {
        ival = node.attributes.values[0];
      }
      var field = new Ext.form.TextField({
        width: 300,
        value: ival
      });
      var ia = [ field ];
      if (hlabel != undefined) {
        ia[ia.length] = hlabel;
      }
      var fieldP = new Ext.Panel({
        frame: true,
        title: node.text,
        items: ia,
        buttons: buttons
      });
      editor.add(fieldP);

      node.getValFunc = function() {
        return field.getValue();
      }
    }

    var leafSingleU32Handler = function(node, hlabel, buttons) {
      var ival = undefined;
      if (node.attributes.values != undefined) {
        ival = node.attributes.values[0];
      }
      var field = new Ext.form.NumberField({
        width: 300,
        allowNegative: false,
        allowDecimals: false,
        maxValue: (Math.pow(2, 32) - 1),
        maskRe: /^\d+$/,
        value: ival
      });
      var ia = [ field ];
      if (hlabel != undefined) {
        ia[ia.length] = hlabel;
      }
      var fieldP = new Ext.Panel({
        title: node.text,
        frame: true,
        items: ia,
        buttons: buttons
      });
      editor.add(fieldP);

      node.getValFunc = function() {
        return field.getValue();
      }
    }

    var filterWildcard = function(arr) {
      var wc = false;
      var narr = [ ];
      for (var i = 0; i < arr.length; i++) {
        if (arr[i] == '*') {
          wc = true;
        } else {
          narr[narr.length] = arr[i];
        }
      }
      if (wc) {
        return narr;
      } else {
        return undefined;
      }
    }

    var leafSingleEnumHandler = function(node, values, hlabel, buttons) {
      var ival = undefined;
      if (node.attributes.values != undefined) {
        ival = node.attributes.values[0];
      }
      var narr = filterWildcard(values);
      var isEditable = false;
      if (narr != undefined) {
        isEditable = true;
        values = narr;
      }
      var field = new Ext.form.ComboBox({
        mode: 'local',
        store: values,
        displayField: 'value',
        emptyText: 'Select a valid value...',
        labelSeparator: '',
        editable: isEditable,
        triggerAction: 'all',
        selectOnFocus: true,
        width: 300,
        value: ival
      });
      var ia = [ field ];
      if (hlabel != undefined) {
        ia[ia.length] = hlabel;
      }
      var fieldP = new Ext.Panel({
        title: node.text,
        frame: true,
        items: ia,
        buttons: buttons
      });
      editor.add(fieldP);

      node.getValFunc = function() {
        return field.getValue();
      }
    }

    var leafSingleBoolHandler = function(node, hlabel, buttons) {
      leafSingleEnumHandler(node, [ 'true', 'false' ], hlabel, buttons);
    }

    var getNodePathStr = function(node) {
      var str = node.getPath('text');
      var newstr = str.replace(/^ Configuration /, '');
      return newstr;
    }
    
    var getConfigPathStr = function(node) {
      var str = node.getPath('text');
      var newstr = str.replace(/^ Configuration /, '');
      return newstr;
    }

    var sendCommandWait = null;

    var sendCommandCli = function(cmds, node, isCreate) {
      var sid = getSessionId();
      if (sid == 'NOTFOUND') {
        // no sid. do nothing.
        return;
      }

      sendCommandWait = Ext.MessageBox.wait('Changing configuration...',
                                            'Configuration');
      
      var sendCommandCliCb = function(options, success, response) {
        var xmlRoot = response.responseXML.documentElement;
        var q = Ext.DomQuery;
        var errmsg = 'Unknown error';
        var success = true;
        var err = q.selectNode('error', xmlRoot);
        if (err == undefined) {
          success = false;
        } else {
          var code = q.selectValue('code', err, 'UNKNOWN');
          if (code == 'UNKNOWN') {
            success = false;
          } else if (code != 0) {
            success = false;
            var msg = q.selectValue('msg', err, 'UNKNOWN');
            if (msg != 'UNKNOWN') {
              errmsg = msg;
            }
          }
        }

        if (sendCommandWait != null) {
          sendCommandWait.hide();
        }
        if (success) {
          var selNode = tree.getSelectionModel().getSelectedNode();
          var selPath = selNode.getPath('text');
          var selText = selNode.text;
          clearEditor();
          if (node == undefined) {
            var p = tree.root;
            var ehandler = function(success, last){
              if (last.getPath('text') != selPath) {
                // we were at leaf. "last" is parent.
                tree.selectPath(selPath, 'text', function(success,sel){
                  var nnode = tree.getSelectionModel().getSelectedNode();
                  nodeClickHandler(nnode, null);
                });
              } else {
                tree.selectPath(selPath, 'text');
                nodeClickHandler(last, null);
              }
            }
            var handler = function(narg){
              tree.expandPath(selPath, 'text', ehandler);
              narg.un('expand', handler); 
            }
            p.on('expand', handler);
            p.collapse();
            p.expand();
          } else if (node.parentNode != undefined) {
            if (isCreate) {
              /*
               * successfully created a node. now need to propagate the
               * "configured" status up the tree (since we only reload the
               * parent node, which only updates all siblings of the newly
               * created node).
               */
              var n = node.parentNode;
              while (n != undefined) {
                if ((n.attributes.configured == 'active')
                    || (n.attributes.configured == 'set')) {
                  // already set. we're done.
                  break;
                }
                n.attributes.configured = 'set';
                n = n.parentNode;
              }
            }
            var p = node.parentNode;
            var handler = function(narg){
              tree.selectPath(selPath, 'text', function(success,sel){
                var nnode = tree.getSelectionModel().getSelectedNode();
                nodeClickHandler(nnode, null);
              });
              narg.un('expand', handler); 
            }
            p.on('expand', handler);
            p.collapse();
            p.expand();
          }
        } else {
          Ext.MessageBox.alert('Configuration',
                               "Changing configuration failed:\n"
                               + errmsg);
        }
      }
      var xmlstr = "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n"
                   + "<vyatta><command><id>" + sid + "</id>\n";
      for (var i = 0; i < cmds.length; i++) {
        xmlstr += "<statement>" + cmds[i] + "</statement>\n";
      }
      xmlstr += "</command></vyatta>\n";
      var conn = new Ext.data.Connection({});
      conn.request({
        url: '/cgi-bin/webgui-wrap', method: 'POST',
        xmlData: xmlstr,
        callback: sendCommandCliCb
      });
    }
    
    var leafSingleHandler = function(node) {
      // help string
      var hlabel = null;
      if (node.attributes.help != undefined) {
        hlabel = new Ext.form.Label({
          text: node.attributes.help
        });
      }

      // buttons
      var buttons = [ ];
      /*
       * buttons:
       *   create:
       *     ! configured ||
       *     configured-deleted
       *   delete:
       *     configured-added ||
       *     configured-active
       *   update:
       *     configured-added ||
       *     configured-active
       * 
       * state:
       *   ! configured: "create"
       *   configured-active typed: "delete", "update"
       *   configured-active typeless: "delete"
       *   configured-added: "delete", "update"
       *   configured-deleted: "create"
       */
      if (node.attributes.configured == undefined
          || node.attributes.configured == 'delete') {
        // not configured or deleted
        buttons[buttons.length] = new Ext.Button({
          text: 'Create',
          handler: function() {
            if (node.attributes.type == undefined) {
              // typeless
              sendCommandCli([ 'set ' + getConfigPathStr(node) ], node,
                             true);
            } else if (node.getValFunc != undefined) {
              sendCommandCli([ 'set ' + getConfigPathStr(node)
                               + " '" + node.getValFunc() + "'"
                             ], node, true);
            }
          }
        });
      } else {
        // active or set
        if (node.attributes.type != undefined) {
          // only add Update button if typed
          buttons[buttons.length] = new Ext.Button({
            text: 'Update',
            handler: function() {
              if (node.attributes.type == undefined) {
                // typeless
                sendCommandCli([ 'set ' + getConfigPathStr(node) ], node);
              } else if (node.getValFunc != undefined) {
                sendCommandCli([ 'set ' + getConfigPathStr(node)
                                 + " '" + node.getValFunc() + "'"
                               ], node);
              }
            }
          });
        }
        buttons[buttons.length] = new Ext.Button({
          text: 'Delete',
          handler: function() {
            sendCommandCli([ 'delete ' + getConfigPathStr(node) ], node);
          }
        });
      }
      
      if (node.attributes.enums != undefined) {
        leafSingleEnumHandler(node, node.attributes.enums, hlabel, buttons);
      } else if (node.attributes.type == undefined) {
        // type-less node
        // XXX needs a handler
      } else if (node.attributes.type == 'bool') {
        leafSingleBoolHandler(node, hlabel, buttons);
      } else if (node.attributes.type == 'u32') {
        leafSingleU32Handler(node, hlabel, buttons);
      } else { //if (node.attributes.type == 'text') {
        // XXX treat everything else as text for now
        leafSingleTxtHandler(node, hlabel, buttons);
      }
     
      editor.doLayout();
    }

    var leafMultiTxtHandler = function(node, hlabel, buttons) {
      var vala = [ ];
      var gridStore = new Ext.data.SimpleStore({
        fields: [
          { name: 'value' }
        ]
      });
      gridStore.loadData(vala);
      if (node.attributes.values != undefined) {
        vala = node.attributes.values;
      }
      
      var GridT = Ext.data.Record.create([
        { name: 'value' }
      ]);

      var grid = new Ext.grid.EditorGridPanel({
        store: gridStore,
        border: true,
        autoScroll: true,
        clicksToEdit: 1,
        frame: true,
        width: 320,
        height: 200,
        sm: new Ext.grid.RowSelectionModel({ singleSelect: true }),
        stripeRows: true,
        columns: [
          { id: 'value',
            header: 'Value',
            width: 300,
            sortable: false,
            dataIndex: 'value',
            editor: new Ext.form.TextField({ })
          }
        ],
        buttons: [
          new Ext.Button({
            text: 'Add',
            handler: function() {
              gridStore.loadData([ '' ], true);
            }
          }),
          new Ext.Button({
            text: 'Delete',
            handler: function() {
              var smod = grid.getSelectionModel();
              if (!smod.hasSelection()) {
                Ext.MessageBox.Alert('Delete value', 'No value selected.');
                return;
              }
              gridStore.remove(smod.getSelected());
            }
          })
        ]
      });
      for (var i = 0; i < vala.length; i++) {
        var v = new GridT({ value: vala[i] });
        gridStore.add(v);
      }

      var ia = [ grid ];
      if (hlabel != undefined) {
        ia[ia.length] = hlabel;
      }
      var fieldP = new Ext.Panel({
        title: node.text,
        frame: true,
        items: ia,
        buttons: buttons
      });
      editor.add(fieldP);
      
      node.getValsFunc = function() {
        var ret = [ ];
        for (var i = 0; i < gridStore.getCount(); i++) {
          ret[i] = gridStore.getAt(i).get('value');
        }
        return ret;
      }
    }

    var leafMultiU32Handler = function(node, hlabel, buttons) {
      var vala = [ ];
      var gridStore = new Ext.data.SimpleStore({
        fields: [
          { name: 'value' }
        ]
      });
      gridStore.loadData(vala);
      if (node.attributes.values != undefined) {
        vala = node.attributes.values;
      }
      
      var GridT = Ext.data.Record.create([
        { name: 'value' }
      ]);

      var grid = new Ext.grid.EditorGridPanel({
        store: gridStore,
        border: true,
        autoScroll: true,
        clicksToEdit: 1,
        frame: true,
        width: 320,
        height: 200,
        sm: new Ext.grid.RowSelectionModel({ singleSelect: true }),
        stripeRows: true,
        columns: [
          { id: 'value',
            header: 'Value',
            width: 300,
            sortable: false,
            dataIndex: 'value',
            editor: new Ext.form.NumberField({
              allowNegative: false,
              allowDecimals: false,
              maxValue: (Math.pow(2, 32) - 1),
              maskRe: /^\d+$/
            })
          }
        ],
        buttons: [
          new Ext.Button({
            text: 'Add',
            handler: function() {
              gridStore.loadData([ '' ], true);
            }
          }),
          new Ext.Button({
            text: 'Delete',
            handler: function() {
              var smod = grid.getSelectionModel();
              if (!smod.hasSelection()) {
                Ext.MessageBox.Alert('Delete value', 'No value selected.');
                return;
              }
              gridStore.remove(smod.getSelected());
            }
          })
        ]
      });
      for (var i = 0; i < vala.length; i++) {
        var v = new GridT({ value: vala[i] });
        gridStore.add(v);
      }
      
      var ia = [ grid ];
      if (hlabel != undefined) {
        ia[ia.length] = hlabel;
      }
      var fieldP = new Ext.Panel({
        title: node.text,
        frame: true,
        items: ia,
        buttons: buttons
      });
      editor.add(fieldP);
      
      node.getValsFunc = function() {
        var ret = [ ];
        for (var i = 0; i < gridStore.getCount(); i++) {
          ret[i] = gridStore.getAt(i).get('value');
        }
        return ret;
      }
    }

    var leafMultiEnumHandler = function(node, values, hlabel, buttons) {
      var vala = [ ];
      var gridStore = new Ext.data.SimpleStore({
        fields: [
          { name: 'value' }
        ]
      });
      gridStore.loadData(vala);
      if (node.attributes.values != undefined) {
        vala = node.attributes.values;
      }
      
      var GridT = Ext.data.Record.create([
        { name: 'value' }
      ]);
      
      var narr = filterWildcard(values);
      var doValidate = true;
      if (narr != undefined) {
        doValidate = false;
        values = narr;
      }

      var grid = new Ext.grid.EditorGridPanel({
        store: gridStore,
        border: true,
        autoScroll: true,
        clicksToEdit: 1,
        frame: true,
        width: 320,
        height: 200,
        sm: new Ext.grid.RowSelectionModel({ singleSelect: true }),
        stripeRows: true,
        columns: [
          { id: 'value',
            header: 'Value',
            width: 300,
            sortable: false,
            dataIndex: 'value',
            editor: new Ext.form.TextField({
              validator: function(cval) {
                if (!doValidate) {
                  return true;
                }
                for (var i = 0; i < values.length; i++) {
                  if (cval == values[i]) {
                    return true;
                  }
                }
                return false;
              }
            })
          }
        ],
        buttons: [
          new Ext.Button({
            text: 'Add',
            handler: function() {
              gridStore.loadData([ '' ], true);
            }
          }),
          new Ext.Button({
            text: 'Delete',
            handler: function() {
              var smod = grid.getSelectionModel();
              if (!smod.hasSelection()) {
                Ext.MessageBox.Alert('Delete value', 'No value selected.');
                return;
              }
              gridStore.remove(smod.getSelected());
            }
          })
        ]
      });
      for (var i = 0; i < vala.length; i++) {
        var v = new GridT({ value: vala[i] });
        gridStore.add(v);
      }
      
      var ia = [ grid ];
      if (hlabel != undefined) {
        ia[ia.length] = hlabel;
      }
      var fieldP = new Ext.Panel({
        title: node.text,
        frame: true,
        items: ia,
        buttons: buttons
      });
      editor.add(fieldP);
      
      /* XXX combo */
      /*
      var vala = [ ];
      var gridStore = new Ext.data.SimpleStore({
        fields: [
          { name: 'value' }
        ]
      });
      gridStore.loadData(vala);
      if (node.attributes.values != undefined) {
        vala = node.attributes.values;
      }
      
      var comboStore = new Ext.data.SimpleStore({
        fields: [
          { name: 'value' }
        ],
        data: values
      });

      var GridT = Ext.data.Record.create([
        { name: 'value' }
      ]);

      var grid = new Ext.grid.EditorGridPanel({
        store: gridStore,
        border: true,
        autoScroll: true,
        clicksToEdit: 1,
        width: 320,
        height: 200,
        sm: new Ext.grid.RowSelectionModel({ singleSelect: true }),
        stripeRows: true,
        columns: [
          { id: 'value',
            header: 'Value',
            dataIndex: 'value',
            width: 300,
            sortable: false,
            editor: new Ext.form.ComboBox({
              mode: 'local',
              store: comboStore,
              width: 250,
              displayField: 'value',
              emptyText: 'Select a valid value...',
              editable: false,
              triggerAction: 'all',
              selectOnFocus: true
            })
          }
        ],
        buttons: [
          new Ext.Button({
            text: 'Add',
            handler: function() {
              var v = new GridT({ value: values[0] });
              gridStore.add(v);
            }
          })
        ],
        title: node.text
      });
      editor.add(grid);
      */

      node.getValsFunc = function() {
        var ret = [ ];
        for (var i = 0; i < gridStore.getCount(); i++) {
          ret[i] = gridStore.getAt(i).get('value');
        }
        return ret;
      }
    }

    var leafMultiHandler = function(node) {
      // help string
      var hlabel = null;
      if (node.attributes.help != undefined) {
        hlabel = new Ext.form.Label({
          text: node.attributes.help
        });
      }

      // buttons
      var buttons = [ ];
      /*
       *   ! configured: "create"
       *   configured-active: "delete", "update" (multi must be typed)
       *   configured-added: "delete", "update"
       *   configured-deleted: "create"
       */
      if (node.attributes.configured == undefined
          || node.attributes.configured == 'delete') {
        // not configured or deleted
        buttons[buttons.length] = new Ext.Button({
          text: 'Create',
          handler: function() {
            if (node.getValsFunc != undefined) {
              var varr = [ ];
              var values = node.getValsFunc();
              for (var i = 0; i < values.length; i++) {
                varr[i + 1] = 'set ' + getConfigPathStr(node)
                              + " '" + values[i] + "'";
              }
              sendCommandCli(varr, node, true);
            }
          }
        });
      } else {
        // active or set
        buttons[buttons.length] = new Ext.Button({
          text: 'Update',
          handler: function() {
            if (node.getValsFunc != undefined) {
              var varr = [ 'delete ' + getConfigPathStr(node) ];
              var values = node.getValsFunc();
              for (var i = 0; i < values.length; i++) {
                varr[i + 1] = 'set ' + getConfigPathStr(node)
                              + " '" + values[i] + "'";
              }
              sendCommandCli(varr, node);
            }
          }
        });
        buttons[buttons.length] = new Ext.Button({
          text: 'Delete',
          handler: function() {
            sendCommandCli([ 'delete ' + getConfigPathStr(node) ], node);
          }
        });
      }

      if (node.attributes.enums != undefined) {
        leafMultiEnumHandler(node, node.attributes.enums, hlabel, buttons);
      } else if (node.attributes.type == 'u32') {
        leafMultiU32Handler(node, hlabel, buttons);
      } else { //if (node.attributes.type == 'text') {
        // XXX treat everything else as text for now
        leafMultiTxtHandler(node, hlabel, buttons);
      }
     
      editor.doLayout();
    }

    tree.getLoader().on('beforeload',
      function(loader, node) {
        var str = node.getPath('text');
        var path = str.replace(/^ Configuration/, '');
        loader.baseParams.nodepath = path;
      }
    );
    tree.on('beforeexpandnode',
      function(node, deep, anim) {
        node.reload();
      }
    );
    tree.on('beforecollapsenode',
      function(node, deep, anim) {
        node.collapseChildNodes(true);
      }
    );
    
    otree.getLoader().on('beforeload',
      function(loader, node) {
        var str = node.getPath('text');
        var path = str.replace(/^ Operation/, '');
        path = path.replace('&lt;value&gt;', 'node.tag', 'g');
        loader.baseParams.nodepath = path;
      }
    );
    otree.getLoader().isOpMode = true;

    var interHandler = function(node) {
      // do nothing for root
      if (getNodePathStr(node) == ' Configuration') {
        return;
      }
      
      // allow configuring all children in edit panel
      var cnodes = node.childNodes;
      for (var i = 0; i < cnodes.length; i++) {
        var cnode = cnodes[i];
        if (cnode.leaf) {
          nodeClickHandler(cnode, null, true);
        }
      }
 
      // help string
      if (node.attributes.help != undefined) {
        var label = new Ext.form.Label({
          text: node.attributes.help
        });
        editor.add(label);
      }

      /*
       *   ! configured: "create"
       *   configured-active: "delete"
       *   configured-added: "delete"
       *   configured-deleted: "create"
       */
      if (node.attributes.configured == undefined
          || node.attributes.configured == 'delete') {
        // not configured or deleted
        editor.add(new Ext.Button({
          text: 'Create',
          handler: function() {
            sendCommandCli([ 'set ' + getConfigPathStr(node) ], node, true);
          }
        }));
      } else {
        // active or set
        editor.add(new Ext.Button({
          text: 'Delete',
          handler: function() {
            sendCommandCli([ 'delete ' + getConfigPathStr(node) ], node);
          }
        }));
      }
      editor.doLayout();
    }

    var interMultiHandler = function(node) {
      /*
       *   all: "add" field
       *   configured-active: "delete"
       *   configured-added: "delete"
       */
      var field = new Ext.form.TextField({
        labelSeparator: '',
        width: 300,
        fieldLabel: 'Add child node'
      });
      var fieldP = new Ext.Panel({
        layout: 'form',
        border: false,
        items: [ field ]
      });
      editor.add(fieldP);
      
      // help string
      if (node.attributes.help != undefined) {
        var label = new Ext.form.Label({
          text: node.attributes.help
        });
        editor.add(label);
      }

      editor.add(new Ext.Button({
        text: 'Add',
        handler: function() {
          sendCommandCli([ 'set ' + getConfigPathStr(node)
                           + " '" + field.getValue() + "'"
                         ], node);
        }
      }));

      if (node.attributes.configured != undefined
          && node.attributes.configured != 'delete') {
        editor.add(new Ext.Button({
          text: 'Delete',
          handler: function() {
            sendCommandCli([ 'delete ' + getConfigPathStr(node) ], node);
          }
        }));
      }
      editor.doLayout();
    }

    var nodeClickHandler = function(node, e, dontClear) {
      if (dontClear == undefined || dontClear == false) {
        clearEditor();
      }
      if (node.leaf) {
        if (node.attributes.multi == undefined || !node.attributes.multi) {
          leafSingleHandler(node);
        } else {
          leafMultiHandler(node);
        }
      } else {
        // non-leaf
        node.expand(false, true, function(n){
          if (n.attributes.multi == undefined || !n.attributes.multi) {
            interHandler(n);
          } else {
            interMultiHandler(n);
          }
        });
      }
    }

    tree.on('click', nodeClickHandler);

    var opClickHandler = function(node, e) {
      clearEditor();
      var str = node.getPath('text');
      var path = str.replace(/^ Operation/, '');
      path = path.replace('&lt;value&gt;', '<value>', 'g');
      var label = new Ext.form.Label({
        text: path
      });
      editor.add(label);

      var narr = [ ];
      var n = node;
      while (n.text != 'Operation') {
        if (n.text == '&lt;value&gt;') {
          narr.push(n);
        }
        n = n.parentNode;
      }

      while (narr.length > 0) {
        n = narr.pop();
        var hlabel = undefined;
        if (n.attributes.help != undefined) {
          hlabel = new Ext.form.Label({
            text: n.attributes.help
          });
        }
        if (n.attributes.enums != undefined) {
          var values = n.attributes.enums;
          /* TODO: backend needs to return proper enums */
          /*var wild = filterWildcard(values);
          var isEditable = false;
          if (wild != undefined) {
            isEditable = true;
            values = wild;
          }*/
          var field = new Ext.form.ComboBox({
            mode: 'local',
            store: values,
            displayField: 'value',
            emptyText: 'Select a valid value...',
            labelSeparator: '',
            //editable: isEditable,
            editable: true,
            triggerAction: 'all',
            selectOnFocus: true,
            width: 300
          });
          var ia = [ field ];
          if (hlabel != undefined) {
            ia[ia.length] = hlabel;
          }
          var fieldP = new Ext.Panel({
            frame: true,
            items: ia
          });
          editor.add(fieldP);

          n.getValFunc = function() {
            return field.getValue();
          }
        } else {
          var field = new Ext.form.TextField({
            width: 300
          });
          var ia = [ field ];
          if (hlabel != undefined) {
            ia[ia.length] = hlabel;
          }
          var fieldP = new Ext.Panel({
            frame: true,
            items: ia
          });
          editor.add(fieldP);

          n.getValFunc = function() {
            return field.getValue();
          }
        }
      }

      var opCmdWait = null;

      var rbut = new Ext.Button({
        text: 'Run',
        handler: function() {
          var narr = [ ];
          var n = node;
          while (n.text != 'Operation') {
            if (n.text == '&lt;value&gt;') {
              narr.push(n.getValFunc());
            } else {
              narr.push(n.text);
            }
            n = n.parentNode;
          }

          var str = '';
          while (narr.length > 0) {
            var c = narr.pop();
            str += (c + ' ');
          }

          var sid = getSessionId();
          if (sid == 'NOTFOUND') {
            // no sid. do nothing.
            return;
          }

          opCmdWait = Ext.MessageBox.wait('Running operational command...',
                                          'Operation');
          
          var opCmdCb = function(options, success, response) {
            var xmlRoot = response.responseXML.documentElement;
            var q = Ext.DomQuery;
            var errmsg = 'Unknown error';
            var success = true;
            var err = q.selectNode('error', xmlRoot);
            if (err == undefined) {
              success = false;
            } else {
              var code = q.selectValue('code', err, 'UNKNOWN');
              if (code == 'UNKNOWN') {
                success = false;
              } else { //if (code != 0) {
                // TODO: backend doesn't return correct code yet
                success = true;
                var msg = q.selectValue('msg', err, 'UNKNOWN');
                if (msg != 'UNKNOWN') {
                  errmsg = msg;
                }
              }
            }

            if (opCmdWait != null) {
              opCmdWait.hide();
            }

            if (success) {
              var mlbl =  new Ext.form.TextArea({
                width: 600,
                height: 500,
                style: 'font-family:monospace',
                value: errmsg
              });
              if (editor.opVal != undefined) {
                editor.remove(editor.opVal);
              }
              editor.opVal = mlbl;
              editor.add(mlbl);
              editor.doLayout();
            } else {
              Ext.MessageBox.alert('Operation',
                                   "Operational command failed:\n"
                                   + errmsg);
            }
          }

          /* send request */
          var xmlstr = "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n"
                       + "<vyatta><command><id>" + sid + "</id>\n"
                       + "<statement>" + str + "</statement>\n"
                       + "</command></vyatta>\n";
          var conn = new Ext.data.Connection({});
          conn.request({
            url: '/cgi-bin/webgui-wrap', method: 'POST',
            xmlData: xmlstr,
            callback: opCmdCb
          });
        }
      });
      editor.add(rbut);
      editor.doLayout();
    }
    otree.on('click', opClickHandler);

    var leftPanel = new Ext.Panel({
        region: 'west',
        split: true,
        margins: '5 0 5 5',
        width: 300,
        minSize: 200,
        maxSize: 400,
        layout: 'accordion',
        items: [ tree, otree ]
    });

    var topPanel = new Ext.Panel({
      title: 'Vyatta Web GUI',
      collapsible: false,
      layout: 'border',
      items: [ leftPanel, editor ]
    });

    var vp = new Ext.Viewport({
      layout: 'fit',
      items: [ topPanel ]
    });
});
