/**`
 * UI - handles mouse and dialog boxes
 *
 * http://www.linuxconsulting.ro
 *
 * Copyright (c) 2012 Nicu Pavel
 * Licensed under the GPL license:
 * http://www.gnu.org/licenses/gpl.html
 */

function UI(scenario)
{
	var turn = 0;
	var map = null;
	/*
	map = GameState.restore();
	console.log(map);
	*/
	if (map === null) 
	{
		var l = new MapLoader();
		l.loadMap(scenario);
		map = l.buildMap();
	}
	map.dumpMap();
	buildMainMenu();
	buildEquipmentWindow();
	
	var r = new Render(map);
	r.cacheImages(function() { r.render(); });
	var canvas = r.getCursorCanvas();
	
	window.oncontextmenu = function() { return false; } //disable rightclick menu
	canvas.addEventListener("mousedown", handleMouseClick, false);
	canvas.addEventListener("mousemove", handleMouseMove, false);
	
	this.mainMenuButton = function(id) { UI:mainMenuButton(id); } //Hack to bring up the mainmenu //TODO remove this

function handleMouseClick(e) 
{
	var hex;
	var minfo = getMouseInfo(canvas, e);
	var cell = r.screenToCell(minfo.x, minfo.y);
	var row = cell.row;
	var col = cell.col;
	
	hex = map.map[row][col];
	
	//Right click only to show unit info
	if (minfo.rclick) 
	{ 
		if (hex.unit) updateUnitInfoWindow(hex.unit);
		return true;
	}
	
	//Clicked hex has a unit ?
	if (hex.unit) 
	{
		if ((map.currentHex.hex !== null) && (hex.isAttackSel))
		{	//attack an allowed hex unit
			var atkunit = map.currentHex.hex.unit;
			if (!atkunit.hasFired)
			{
				r.drawAnimation(row, col);		
				map.attackUnit(atkunit, map.currentHex.row, map.currentHex.col, hex.unit, row, col);
			}
		}	
		else //Select the new unit
		{
			map.selectUnit(row, col);
		}
		/*
		var c  = parseInt(map.getPlayer(hex.unit.owner).country);
		$('eqSelCountry').country = c + 1;
		//TODO make unitList show strength/movement/attack status and update it on all actions
		updateEquipmentWindow(hex.unit.unitData.class); 
		*/
	}	
	else
	{
		//Do we already have a selected unit ?
		if (map.currentHex.hex != null)
		{	
			srcHex = map.currentHex.hex;
			//move to an allowed hex
			if (hex.isMoveSel && !srcHex.unit.hasMoved) 
			{
				var win = map.moveUnit(srcHex.unit, map.currentHex.row, map.currentHex.col, row, col);
				if (win >= 0) 
				{ 
					UI:uiMessage("Victory","Side " + sidesName[win] + " wins by capturing all victory hexes"); 
				}
			} 		
			map.delCurrentHex();
		}
		else
		{
			console.log("No unit at:" + cell.row + "," + cell.col);
		}
		map.delMoveSel();
		map.delAttackSel();
	}
	//ToDo partial screen updates
	r.render(); 
}

function handleMouseMove(e) 
{
	var minfo = getMouseInfo(canvas, e);
	var cell = r.screenToCell(minfo.x, minfo.y);
	var row = cell.row;
	var col = cell.col;
	
	var hex = map.map[row][col];
	var text = terrainNames[hex.terrain] + " (" + row + "," + col + ")";
	if (hex.name !== null)	{  text = hex.name + " " + text; }
	if (hex.unit != null)	{  text = " Unit: " + hex.unit.unitData.name + " " + text; }
	if (map.currentHex.hex != null) { r.drawCursor(cell); }
	$('locmsg').innerHTML = text;
}

function buildMainMenu()
{
	//menu buttons div with id is the filename from resources/ui/menu/images
	var menubuttons = [["buy","Requisition Units(TBD)"],["inspectunit","Unit Info"],["hex","Toggle Showing of Hexes"],
					   ["air","Toggle Air More On (TBD)"],["zoom","Zoom Map"],["undo","Undo Last Move(TBD)"],
					   ["endturn","End turn"], ["mainmenu", "Main Menu"]];
					   
	var sd = addTag('menu','div');
	sd.id = "statusmsg";
	sd.className = "message";
	sd.innerHTML = " Turn: " + turn + "  " + map.description;
	
	for (b in menubuttons) 
	{
		var div = addTag('menu','div');
		var img = addTag(div, 'img');
		
		var id = menubuttons[b][0];
		var title = menubuttons[b][1];
		div.id = id;
		div.title = title;
		div.className = "button";
		img.id = id;
		img.src = "resources/ui/menu/images/" + id + ".png";
		
		div.onclick = function() { UI:mainMenuButton(this.id); }
		div.onmouseover = function() { hoverin(this.firstChild); }
		div.onmouseout = function() { hoverout(this.firstChild); }
	}
	
	var ld = addTag('menu','div');
	ld.id = "locmsg"
	ld.className = "message";
}

function mainMenuButton(id)
{
	console.log("Clicked button: " + id);
	switch(id) 
	{
		case 'hex':
		{
			r.style.toggleHexes();
			r.render();
			break;
		}
		case 'zoom':
		{	
			var zoom = Math.min(window.innerWidth/canvas.width*100, window.innerHeight/canvas.height*100);
			if ($('game').style.zoom === "100%" || $('game').style.zoom === '' )
			{ 
				$('game').style.zoom = zoom + "%"; 
				r.isZoomed = true;
			}
			else 
			{ 
				$('game').style.zoom = "100%";
				r.isZoomed = false;
			}
			r.render();
			break;
		}
		
		case 'endturn':
		{
			//TODO Handle End Turn in Map Class or create a Game Class
			map.resetUnits();
			map.delMoveSel();
			map.delAttackSel();
			map.delCurrentHex();
			GameState.save(map);
			turn++;
			$('statusmsg').innerHTML = " Turn: " + turn + "  " + map.description;
			r.render();
			break;
		}
		
		case 'inspectunit':
		{
			var v = $('unit-info').style.visibility;
			
			if (v === "visible") { $('unit-info').style.visibility = "hidden"; }
			else 
			{
				//Just to show some window with dummy data if user press with no unit selected
				$('unit-info').style.visibility = "visible"; 
				if (map.currentHex.hex != null && map.currentHex.hex.unit != null) 
				{ 
					updateUnitInfoWindow(map.currentHex.hex.unit);
					map.currentHex.hex.unit.log();
					map.currentHex.hex.log();
				}
			}
			break;
		}
		case 'buy':
		{
			var v = $('equipment').style.visibility;
			
			if (v === "visible") 
			{ 
				$('equipment').style.visibility = "hidden"; 
				$('container-unitlist').style.visibility = "hidden"; 
			}
			else 
			{ 
				$('equipment').style.visibility = "visible"; 
				$('container-unitlist').style.visibility = "visible"; 
				updateEquipmentWindow(2); //By default show tanks
			}
			break;
		}	
		case 'mainmenu':
		{
			uiMessage("HTML5 Panzer General version 1.1", "Copyright 2012 Nicu Pavel <br> " +
			"npavel@linuxconsulting.ro <br><br> Available scenarios:<br>");
			
			var scnSel = addTag('message', 'select');
			scnSel.onchange = function(){ UI:newScenario(this.options[this.selectedIndex].value);}
			
			for (var i = 0; i < scenariolist.length; i++)
			{
				var scnOpt = addTag(scnSel, 'option');
				scnOpt.value = "resources/scenarios/xml/" + scenariolist[i][0];
				scnOpt.text =  scenariolist[i][1];
			}
			break;
		}
	}
}

function getMouseInfo(canvas, e)
{
	var mx, my, rclick;
	if (e.which) rclick = (e.which == 3);
	else if (e.button) rclick = (e.button == 2);				
	mx = e.clientX - canvas.offsetLeft + document.body.scrollLeft + document.documentElement.scrollLeft;
	my = e.clientY - canvas.offsetTop + document.body.scrollTop + document.documentElement.scrollTop;;	
	
	return new mouseInfo(mx, my, rclick);
}

function updateUnitInfoWindow(u)
{
	$('unit-info').style.visibility  = "visible";
	
	//Call from equipment window
	if (typeof (u.unitData) === 'undefined') 
	{
		u.unitData = u;
		u.flag = u.country;
		u.strength = 10;
	}
	$('unit-image').style.backgroundImage = "url(" + u.unitData.icon +")";
	$('unit-flag').style.backgroundImage = "url('resources/ui/flags/flag_big_" + u.flag +".png')";
	$('unit-name').innerHTML = u.unitData.name;
	$('fuel').innerHTML = u.fuel;
	$('ammo').innerHTML = u.ammo;
	$('str').innerHTML = u.strength + "/10";
	$('gunrange').innerHTML = u.unitData.gunrange;
	$('ini').innerHTML = u.unitData.initiative;
	$('spot').innerHTML = u.unitData.spotrange;
	$('ahard').innerHTML = u.unitData.hardatk;
	$('asoft').innerHTML = u.unitData.softatk;
	$('aair').innerHTML = u.unitData.airatk;
	$('anaval').innerHTML = u.unitData.navalatk;
	$('dhard').innerHTML = u.unitData.grounddef;
	$('dair').innerHTML = u.unitData.airdef;
	$('dclose').innerHTML = u.unitData.closedef;
	$('drange').innerHTML = u.unitData.rangedefmod;

	$('iokbut').onclick = function() { $('unit-info').style.visibility = "hidden"; }
}

function uiMessage(title, message)
{
	$('title').innerHTML = title;
	$('message').innerHTML = message;
	$('ui-message').style.visibility = "visible"
	$('uiokbut').onclick = function() { $('ui-message').style.visibility = "hidden"; }
}

function newScenario(scenario)
{
	turn = 0;
	GameState.clear();
	l.loadMap(scenario);
	map = l.buildMap();
	map.dumpMap();
	r.setNewMap(map);
	r.cacheImages(function() { r.render(); });
	$('statusmsg').innerHTML = " Turn: " + turn + "  " + map.description;
}

function buildEquipmentWindow()
{
	//Build the class selection buttons [button name, description, unit class id from equipment.js]
	var eqClassButtons = [['but-aa','Air defence', 9],['but-at', 'Anti-tank', 4],['but-arty', 'Artillery', 8],
					  ['but-inf', 'Infantry', 1],['but-rcn','Recon', 3],['but-tank', 'Tank', 2],
					  ['but-af','Air Fighter', 10], ['but-ab','Air Bomber', 11]];
	
	//The default selected country in the div
	var c = parseInt(map.getPlayer(0).country); //Start from 1
	var pos = -21 * c;
	$('eqSelCountry').country = c + 1;
	$('eqSelCountry').owner = 0;
	$('eqSelCountry').style.backgroundPosition = "" + pos + "px 0px";
	$('eqSelCountry').title = 'Click to change country';
	$('eqSelCountry').onclick = function() 
		{
			var c = this.country; 
			if (c >= 26) c = 0; 
			var flagPos = -21 * c;
			this.style.backgroundPosition = "" + flagPos +"px 0px";
			this.country = ++c; 
			updateEquipmentWindow(2);
		};
	//Unit Class buttons	
	for (b in eqClassButtons)
	{
		var div = addTag('eqSelClass','div');
		var img = addTag(div, 'img');
		
		var id = eqClassButtons[b][0];
		div.id = id;
		div.title = eqClassButtons[b][1];
		div.eqclass = eqClassButtons[b][2]; //Hack to get parameter passed
		img.id = id;
		img.src = "resources/ui/dialogs/equipment/images/" + id + ".png";
		div.onclick = function() { UI:updateEquipmentWindow(this.eqclass); }
	}
	
	$('eqOkBut').onclick = function() 
		{ 
			$('equipment').style.visibility = "hidden"; 
			$('container-unitlist').style.visibility = "hidden"; 
		}
}

function updateEquipmentWindow(eqclass)
{
	//Remove older entries
	$('unitlist').innerHTML = "";
	$('eqUnitList').innerHTML = "";
	
	//The current selected coutry in the div
	var country = $('eqSelCountry').country;
	console.log("Country: " + country);
	//The actual units on the map
	var unitList = map.getUnits();
	for (var i = 0; i < unitList.length; i++)
	{
		//TODO should check owners not countries
		if (unitList[i].unitData.country === country)
		{
			var div = addTag('unitlist', 'div');
			var img = addTag(div, 'img');
			var txt = addTag(div, 'div');
			div.className = "eqUnitBox";
			img.src = unitList[i].unitData.icon;
			txt.innerHTML = unitList[i].unitData.name;
			div.eqclass = unitList[i].unitData.class;
			div.country = unitList[i].unitData.country;
			div.onclick = function() 
				{ 
					$('eqSelCountry').country = this.country; 
					UI:updateEquipmentWindow(this.eqclass);
				}
		}
	}
	
	//Don't change the listing on dummy class
	if (eqclass == 0) return;
	
	//Units in equipment
	for (var i in equipment)
	{
		var u = equipment[i];
		if ((u.class === eqclass) && (u.country === country))
		{
			var div = addTag('eqUnitList', 'div');
			var img = addTag(div, 'img');
			var txt = addTag(div, 'div');
			div.className = "eqUnitBox";
			div.unitid = u.id;
			div.onclick = function() { updateUnitInfoWindow(equipment[this.unitid]); };
			img.src = u.icon;
			txt.innerHTML = u.name + " - " + u.cost*12 + " ";
			txt.innerHTML += "<img src='resources/ui/dialogs/equipment/images/currency.png'/>";
		}
	}
}

} //End of UI class

function gameStart()
{
	rng = Math.round(Math.random() * (scenariolist.length - 1))
	scenario = "resources/scenarios/xml/" +  scenariolist[rng][0];
	console.log("Number: " + rng + " Scenario:" + scenario);
	
	//scenario="resources/scenarios/xml/dessau.xml";
	ui = new UI(scenario);
	//Bring up the "Main Menu"
	ui.mainMenuButton('mainmenu');
}