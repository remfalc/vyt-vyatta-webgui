/* 
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */
///////////////////////////////////////////////////////////////////////////////
// file name: vyatta_grid_checkColumn.js
///////////////////////////////////////////////////////////////////////////////

Vyatta_grid_CheckColumn = function(config)
{
    Ext.apply(this, config);
    if(!this.id)
        this.id = Ext.id();

    this.renderer = this.renderer.createDelegate(this);
};

Vyatta_grid_CheckColumn.prototype =
{
    init : function(grid)
    {
        this.grid = grid;
        this.grid.on('render', function()
        {
            var view = this.grid.getView();
            view.mainBody.on('mousedown', this.onMouseDown, this);
            view.on('mousedown', this.onMouseDown, this);
        }, this);
    },

    onMouseDown : function(e, t)
    {
        if(t.className && t.className.indexOf('x-grid3-cc-'+this.id) != -1)
        {
            e.stopEvent();
            var index = this.grid.getView().findRowIndex(t);
            var record = this.grid.store.getAt(index);
            record.set(this.dataIndex, !record.data[this.dataIndex]);

            if(record.modified[this.dataIndex] == record.data[this.dataIndex])
                f_commitSingleStoreField(this.grid.store, record, this.dataIndex, index);
        }

        if(this.callback != undefined)
            this.callback.call();

    },

    renderer : function(v, p, record)
    {
        p.css += ' x-grid3-check-col-td';
        return '<div class="x-grid3-check-col'+(v?'-on':'')+' x-grid3-cc-'+this.id+'">&#160;</div>';
    }
};

////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
Vyatta_grid_RadioColumn = function(config)
{
    Ext.apply(this, config);
    if(!this.id)
        this.id = Ext.id();

    this.renderer = this.renderer.createDelegate(this);
};

Vyatta_grid_RadioColumn.prototype =
{
    init : function(grid)
    {
        this.grid = grid;
        this.grid.on('render', function()
        {
            var view = this.grid.getView();
            view.mainBody.on('mousedown', this.onMouseDown, this);
        }, this);
    },

    onMouseDown : function(e, t)
    {
        if(t.className && t.className.indexOf('x-grid3-cc-'+this.id) != -1)
        {
            e.stopEvent();
            var index = this.grid.getView().findRowIndex(t);
            var record = this.grid.store.getAt(index);
            record.set(this.dataIndex, this.inputValue);
        }
    },

    renderer : function(v, p, record)
    {
        p.css += ' x-grid3-check-col-td';
        return '<div class="x-grid3-check-col'+
            (v == this.inputValue?'-on':'')+
            ' x-grid3-cc-'+this.id+'"> </div>';
    }
};

/*
 *
 */
function f_handleOnRadioColumnClick(store, buttons)
{
    ///////////////////////////////////////////////////////////
    // make sure only one row is checking
    var rowIndex =0;
    var newIndex = -1;

    store.each(function(record)
    {
        if(record.get('checker'))
        {
            if(store.rowIndex != undefined && store.rowIndex == rowIndex)
            {
                record.set('checker', false);
                record.commit(false);
            }
            else
                newIndex = rowIndex;
        }

        rowIndex++;
    });
    store.rowIndex = newIndex;

    //////////////////////////////////
    // enable/disable action button
    if(buttons != undefined)
    {
        for(var i=0; i<buttons.length; i++)
            store.rowIndex > -1 ? buttons[i].enable():
                                  buttons[i].disable();
    }
}