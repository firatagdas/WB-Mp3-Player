(function()
{ // anonim fonksiyon

if (!window.console)
{
	window.console = {};
	
	var fn = ['assert', 'error', 'info', 'log', 'trace', 'warn'], i = 0;
	if (window.console.log && !window.console.debug)
	{
		window.console.debug = window.console.log;
	}
	
	for (i = 0; i < fn.length; ++i)
	{
		if (!window.console[fn[i]])
		{
			window.console[fn[i]] = function(){};
		}
	}
}


/**
 * Versiyon bilgileri
 */
var VERSION = '1.0.0 Alpha 1',
APPNAME = 'WB_Mp3Player',

/** 
* Sadece Obfuscate sırasına işe yarayacak alanlar...
*/
SLICE = Array.prototype.slice,

ID_PREFIX = 'wbmp3player_',

/**
 * Yapılandırma
 */
Config = 
{
	/**
	 * belki Skinning için kullanılabilir.
	 */
	_progressBarBgPosition: [-288, -373],
	_volumePixelLimits: [23, 48],
	
	/**
	 * Global Yapılandırma
	 */

	flashPlayerPath: 'flash/player_mp3_js.swf',
	
	resourceType: 'localJson',
	
	updateTimer: 1000,
	
	volume: 60,
	
	autoPlay: true,
	
	suffle: false,
	
	repeat: false,
	
	moveable: true,
	
	debug: false
},

CurrentSongData =
{
	isPlaying: false,
	
	bytesTotal: 0,
		
	bytesLoaded: 0,
	
	bytesPercent: 0,

	position: 0,

	duration: 0,

	url: '',
		
	artist: '',
	        
	album: '',
		
	songName: '',
		
	genre: '',
		
	year: '',
		
	track: '',
		
	comment: ''
},

LISTENERNAME = 'WB_Mp3Player_Instance',

ERROR_NOT_LOADED = 'Lütfen mp3 Player yüklenirken bekleyin.';

ERROR_LOAD_FAIL = 'Mp3 Player yüklenemediği için devam edilemiyor.\nBu işlem için Flash Player gereklidir.';

FLASH_ERROR = ERROR_NOT_LOADED;

// bir takım araçlar

function consoleLog()
{
	if (Config.debug && window.console && window.console.log)
	{
		console.log.apply(console, arguments);
	}
}

function simpleMerge(refArray, mergeArray)
{
	var newArray = [], len = -1;
	
	for (var i = 0; i < refArray.length; i++)
	{
		newArray[++len] = refArray[i];
	}
	
	len = -1;
	for (i = 0; i < mergeArray.length; i++)
	{
		newArray[++len] = mergeArray[i];
	}
	
	return newArray;
}

function bindContext(fn, scope)
{
	var args = [];
	if (arguments.length > 2)
	{
		args = SLICE(arguments, 2);
	}

	return function()
	{
		return fn.apply(scope || this, simpleMerge(arguments, args));
	}
}

function htmlSpecialChars(targetStr)
{
	var str = String(targetStr), find = ['<', '>', '"'], replace = ['&lt;', '&gt;', '&quot;'];
	for (var i = 0; i < find.length; i++)
	{
		str = str.replace(find[i], replace[i]);
	}
	
	str = str.replace(/&(?!(amp;))/g, '&amp;');
	
	return str;
}

function rand(r1, r2)
{
	return Math.floor(Math.random() * (r2 - r1)) + r1;
}

function intval(data)
{
	data = parseInt(data, 10);
	if (isNaN(data))
	{
		data = 0;
	}
	
	return data;
}

function WB_Mp3Player_InterfaceController()
{
	this.__construct.apply(this, arguments);
}

WB_Mp3Player_InterfaceController.prototype = 
{
	_mainInstance: null,
	
	_animRunning: false,
	
	_containerNode: null,
	_playerNode: null,
	_detailNode: null,
	_playListNode: null,
	_scrollBarNode: null,
	_volumeControlNode: null,
	_muteControlNode: null,
	_playControlNode: null,
	
	_preparedSongId: null,
	_preparedSongNode: null,
	_currentSongId: null,
	_currentSongNode: null,
	_currentProgressNode: null,
	_currentTimeNode: null,
	
	_progressBarWidth: null,
	_scrollBarHeight: null,
	
	_lastNode: null,
	_firstNode: null,
	
	_lastVolume: 0,
	_muteVolume: 0,

	__construct: function(WB_Mp3Player)
	{
		this._mainInstance = WB_Mp3Player;
		this._containerNode = this._mainInstance._containerNode;
		
		this._buildUI();
		this._bindUI();
	},
	
	_buildUI: function()
	{
		if ($.browser.msie)
		{
			document.write('<scr' + 'ipt type="text/jav' + 'ascript" event="FSCommand(command,args)" for="' + LISTENERNAME + '_Flash">eval(args);</sc' + 'ript>');
			// var src = $('<script type="text/javascript" event="FSCommand(command, args)" for="' + LISTENERNAME + '_Flash">eval(args);</script>');
			// this._containerNode.after(src);
		}
		
		this._containerNode
			.append($('<div class="wb-mp3player" id="' + ID_PREFIX + '_player">'
				+ '<div class="border">'
				+ '<div class="main">'
				+ '	<div class="playlist" id="' + ID_PREFIX + '_playlist"></div>'
				+ '	<div class="controls">'
				+ '		<a class="prev" id="' + ID_PREFIX + '_control_prev"></a>'
				+ '		<a class="play" id="' + ID_PREFIX + '_control_play"></a>'
				+ '		<a class="stop" id="' + ID_PREFIX + '_control_stop"></a>'
				+ '		<a class="next" id="' + ID_PREFIX + '_control_next"></a>'
				+ '		<a class="volume" id="' + ID_PREFIX + '_control_volume"></a>'
				+ '		<a class="mute" id="' + ID_PREFIX + '_control_mute"></a>'
				+ '	</div>'
				+ '</div>'
				+ '<div class="scroll">'
				+ '	<span class="up" id="' + ID_PREFIX + '_scroll_up"></span>'
				+ '	<span class="barcontainer"><span class="bar" id="' + ID_PREFIX + '_scroll_bar"></span></span>'
				+ '	<span class="down" id="' + ID_PREFIX + '_scroll_down"></span>'
				+ '</div>'
				+ '<div class="detail" style="height: 0px; overflow: hidden; display: none" id="' + ID_PREFIX + '_detail">'
				+ '<div class="context">'
				+ '	<table cellpadding="2" cellspacing="0" border="0" width="100%">'
				+ '	<tr>'
				+ '		<td><input type="checkbox" id="' + ID_PREFIX + '_control_suffle" /></td>'
				+ '		<td>Karıştır</td>'
				+ '		<td><input type="checkbox" id="' + ID_PREFIX + '_control_repeat" /></td>'
				+ '		<td>Yinele</td>'
				+ '		<td width="100%" align="right">&raquo;</td>'
				+ '	</tr>'
				+ '	</table>'
				+ '</div>'
				+ (Config.moveable ? '<span class="move"></span>' : '')
				+ '</div>'
				+ '</div>'
				+ '<a href="#" class="expand" id="' + ID_PREFIX + '_expand_collapse"></a>'))
			.unselectable();
			
		this._playerNode = $('#' + ID_PREFIX + '_player');
		this._detailNode = $('#' + ID_PREFIX + '_detail');
		this._playListNode = $('#' + ID_PREFIX + '_playlist');
	},
	
	_bindUI: function()
	{
		if (Config.moveable)
		{
			this._playerNode.drag(
				function(e, dd)
				{
					$(this).css({left: dd.offsetX, top: dd.offsetY});
				},
				{ 
					handle: '.move'
				}
			);
		}
			
		$('#' + ID_PREFIX + '_expand_collapse').click(
			bindContext(this._expandCollapseController, this)
		);
			
		$('#' + ID_PREFIX + '_scroll_up').click(
			bindContext(this._scrollMoveUp, this)
		);
			
		$('#' + ID_PREFIX + '_scroll_down').click(
			bindContext(this._scrollMoveDown, this)
		);
			
		this._playControlNode = $('#' + ID_PREFIX + '_control_play').click(
			bindContext(this._controlPlay, this)
		);
			
		$('#' + ID_PREFIX + '_control_stop').click(
			bindContext(this._controlStop, this)
		);
			
		$('#' + ID_PREFIX + '_control_prev').click(
			bindContext(this._controlPrev, this)
		);
			
		$('#' + ID_PREFIX + '_control_next').click(
			bindContext(this._controlNext, this)
		);
			
		this._volumeControlNode = $('#' + ID_PREFIX + '_control_volume').click(
			bindContext(this._controlVolumeClick, this)
		);
			
		this._muteControlNode = $('#' + ID_PREFIX + '_control_mute').click(
			bindContext(this._controlMuteClick, this)
		);
			
		this._scrollBarNode = $('#' + ID_PREFIX + '_scroll_bar');
		
		$('#' + ID_PREFIX + '_control_repeat')
			.click(
				bindContext(this._controlRepeatClick, this)
			)
			.attr('checked', Config.repeat);
			
		$('#' + ID_PREFIX + '_control_suffle')
			.click(
				bindContext(this._controlSuffleClick, this)
			)
			.attr('checked', Config.suffle);
	},
	
	_bindScrollBar: function()
	{
		if (this._mainInstance._songIndex > 11)
		{
			var barContainer = this._scrollBarNode.parent(), 
				playListNode = this._playListNode,
				maxScrollHeight = this._getScrollBarHeight();
				
			this._scrollBarNode
				.drag('start', function(e, dd)
				{
					dd.limit = {top: 0};
					dd.limit.bottom = barContainer.innerHeight() - $(this).outerHeight();
				})
				.drag(
					function(e, dd)
					{
						var offsetTop = Math.min(dd.limit.bottom, Math.max(dd.limit.top, dd.offsetY)),
							diff = playListNode.attr('scrollHeight') - playListNode.outerHeight();
						
						$(this).css({top: offsetTop + 'px'});

						playListNode.scrollTop(offsetTop * diff / maxScrollHeight);
					}, 
					{ 
						relative: true 
					}
				);
		}
	},
	
	_controlPlay: function(e)
	{
		e.preventDefault();
		this._play($(e.target));
		
	},
	
	_play: function(node, songId)
	{
		if (!this._checkFlash())
		{
			return;
		}
		
		if (node.hasClass('play'))
		{
			if (this._mainInstance._songIndex > 0)
			{
				node.removeClass('play').addClass('pause');
				
				songId = songId || this._preparedSongId;
				if (!songId)
				{
					this._cacheFirstSongIfNoAny();
				}
				else if (songId != this._preparedSongId)
				{
					this._setForPrepare(songId);
				}
				
				this._setPreparedToCurrent();
				this._mainInstance._play();
			}
		}
		else
		{
			node.removeClass('pause').addClass('play');
			this._mainInstance._pause();
		}
	},
	
	_controlStop: function(e)
	{
		e.preventDefault();
		this._stop();
	},
	
	_stop: function()
	{
		if (!this._checkFlash())
		{
			return;
		}
		
		this._resetCurrent();
		this._mainInstance._stop();
		
		var playControl = $('#' + ID_PREFIX + '_control_play');
		if (playControl.hasClass('pause'))
		{
			playControl.removeClass('pause').addClass('play');
		}
	},
	
	_controlPrev: function(e)
	{
		e.preventDefault();
		this._prev();
	},
	
	_prev: function()
	{
		if (!this._checkFlash())
		{
			return;
		}
		
		if (this._mainInstance._songIndex > 0)
		{
			var node, prev, prevId;
			
			if (Config.suffle)
			{
				if (--this._mainInstance._suffleIndex < 0)
				{
					this._mainInstance._suffleIndex = this._mainInstance._songIndex - 1;
				}
				
				prevId =  this._mainInstance._suffleList[this._mainInstance._suffleIndex];
				prev = $('#' + ID_PREFIX + 'song_' + prevId);
			}
			else
			{
				this._cacheFirstSongIfNoAny();

				node = this._currentSongNode || this._preparedSongNode;
				if (!node)
				{
					node = this._lastNode;
				}
				else
				{
					prev = node.prev();
					if (!prev[0])
					{
						prev = this._lastNode;
					}
				}
				
				prevId = prev.data('songIndex');
			}
			
			this._setForPrepare(prevId, prev);
			if (CurrentSongData.isPlaying == 'true')
			{
				this._setPreparedToCurrent();
				this._mainInstance._play();
			}
			
			this._restoreScroll(prev);
		}
	},
	
	_controlNext: function(e)
	{
		e.preventDefault();
		this._next();
	},
	
	_next: function()
	{
		if (!this._checkFlash())
		{
			return;
		}
		
		if (this._mainInstance._songIndex > 0)
		{
			var node, next, nextId;
			
			if (Config.suffle)
			{
				if (++this._mainInstance._suffleIndex >= this._mainInstance._songIndex)
				{
					this._mainInstance._suffleIndex = 0;
				}
				
				nextId = this._mainInstance._suffleList[this._mainInstance._suffleIndex];
				next = $('#' + ID_PREFIX + 'song_' + nextId);
			}
			else
			{
				this._cacheFirstSongIfNoAny();

				node = this._currentSongNode || this._preparedSongNode;
				if (!node)
				{
					node = this._firstNode;
				}
				else
				{
					next = node.next();
					if (!next[0])
					{
						next = this._firstNode;
					}
				}
				
				nextId = next.data('songIndex');
			}
			
			this._restoreScroll(next);
			
			this._setForPrepare(nextId, next);
			if (CurrentSongData.isPlaying == 'true')
			{
				this._mainInstance._stop();
				this._setPreparedToCurrent();
				this._mainInstance._play();
			}
		}
	},
	
	_controlVolumeClick: function(e)
	{
		var delta = null, 
			volume = null, 
			x = e.offsetX,
			limitLeft = Config._volumePixelLimits[0],
			limitRight = Config._volumePixelLimits[1];
		if (x >= limitLeft && x <= limitRight)
		{
			delta = limitRight - limitLeft;
			volume = 100 * (x - limitLeft) / delta;
		}
		else if (x < limitLeft)
		{
			volume = 0;
		}
		else if (x > limitRight)
		{
			volume = 100;
		}
		
		if (volume !== null)
		{
			this._setVolume(volume);
		}
	},
	
	_setVolume: function(volume)
	{
		if (!this._checkFlash())
		{
			return;
		}
		
		volume = intval(volume);
		if (!isNaN(volume))
		{
			volume = Math.max(0, Math.min(volume, 100));
		}
		else
		{
			volume = 60;
		}
			
		if (volume != this._lastVolume)
		{
			this._setVolumeLevel(volume);
			this._mainInstance._setVolume(volume);
			this._setMute(volume == 0);
			
			this._lastVolume = volume;
		}
	},
	
	_setVolumeLevel: function(volume)
	{
		this._volumeControlNode.attr('className', 'volume-l' + Math.max(0, Math.round(volume / 10) - 1));
	},
	
	_controlMuteClick: function(e)
	{
		e.preventDefault();
		
		this._mute();
	},
	
	_setMute: function(active)
	{
		var muteNode = this._muteControlNode;
		if (active)
		{	
			muteNode.removeClass('mute-active').addClass('mute');
			consoleLog('WB_Mp3Player :: mute açık.');
		}
		else
		{
			muteNode.removeClass('mute').addClass('mute-active');
			consoleLog('WB_Mp3Player :: mute kapalı.');
		}
	},
	
	_mute: function()
	{
		if (this._lastVolume == 0)
		{
			this._setVolume(this._muteVolume);
		}
		else
		{
			this._muteVolume = this._lastVolume;
			this._setVolume(0);
		}
	},
	
	_expandCollapseController: function(e)
	{
		e.preventDefault();
		
		if (!this._animRunning)
		{
			var node = $(e.target), detailNode = this._detailNode;
			if (node.hasClass('expand'))
			{
				node.removeClass('expand').addClass('collapse');	
				detailNode.css('display', '');
				
				this._animate(detailNode, {height: 40}, 300, 'easeOutQuad');
			}
			else
			{
				node.removeClass('collapse').addClass('expand');
				this._animate(detailNode, {height: 0}, 300, 'easeInQuad', function()
				{
					detailNode.css('display', 'none');
				});	
			}
		}
	},
	
	appendSong: function(index, title, duration)
	{
		var songLine = $('<div class="playsong" id="' + ID_PREFIX + 'song_' + index + '">'
			+ 	'<div class="progress" style="background-position: ' + intval(Config._progressBarBgPosition[0]) + 'px ' + intval(Config._progressBarBgPosition[1]) + 'px">'
			+ 		'<span class="time">' + htmlSpecialChars(duration) + '</span>'
			+ 		'<span class="song"><strong>' + htmlSpecialChars(index) + '.</strong> ' + htmlSpecialChars(title) + '</span>'
			+ 	'</div>'
			+ '</div>');
		this._playListNode.append(songLine);
		
		songLine.data('songIndex', index);
		songLine.click(bindContext(this._clickSong, this));
		
		if (this._firstNode === null)
		{
			this._firstNode = songLine;
		}
		
		this._lastNode = songLine;
	},
	
	_clickSong: function(e)
	{
		var songNode = $(e.currentTarget);
		if (!songNode.hasClass('playsong-selected'))
		{
			this._setForPrepare(songNode.data('songIndex'), songNode);
		}
		else if (this._preparedSongId !== null && this._currentSongId != this._preparedSongId)
		{
			this._mainInstance._stop();
			this._setPreparedToCurrent();
			this._mainInstance._play();
		}
	},
	
	_controlSuffleClick: function(e)
	{
		var node = $(e.target);
		if (node.attr('checked'))
		{
			this._mainInstance._createSuffleList();
			Config.suffle = true;
		}
		else
		{
			this._mainInstance._resetSuffleList();
			Config.suffle = false;
		}
	},
	
	_controlRepeatClick: function(e)
	{
		Config.repeat = $(e.target).attr('checked');
	},
	
	_getSongNode: function(index, songNode)
	{
		if (!songNode || !songNode[0])
		{
			songNode = $('#' + ID_PREFIX + 'song_' + index);
		}

		return songNode;
	},
	
	_setPreparedNode: function(index, songNode)
	{
		songNode = this._getSongNode(index, songNode);
		
		this._preparedSongNode = songNode;
		this._preparedSongId = index;
		
		this._mainInstance.setPreparedSongId(index);
	},
	
	_setCurrentNode: function(index, songNode)
	{
		songNode = this._getSongNode(index, songNode);
		
		this._currentSongNode = songNode;
		this._currentSongId = index;
		
		this._currentProgressNode = songNode ? songNode.find('.progress') : null;
		this._currentTimeNode = songNode ? songNode.find('.time') : null;
		
		this._mainInstance.setCurrentSongId(index);
	},
	
	_setForPrepare: function(index, songNode)
	{
		songNode = this._getSongNode(index, songNode);
		
		var preparedSongId = this._preparedSongId,
			currentSongId = this._currentSongId;
		
		if (this._preparedSongNode !== null 
			&& (currentSongId === null || currentSongId != preparedSongId))
		{
			this._preparedSongNode.removeClass('playsong-selected').addClass('playsong');
		}
		
		songNode.removeClass('playsong').addClass('playsong-selected');
		
		this._setPreparedNode(index, songNode);
	},
	
	_setPreparedToCurrent: function()
	{
		this._cacheFirstSongIfNoAny();
		
		var preparedSongId = this._preparedSongId,
			currentSongId = this._currentSongId;

		if (currentSongId !== null && preparedSongId != currentSongId)
		{
			this._currentSongNode.removeClass('playsong-selected').addClass('playsong');
			this._resetCurrent();
		}
		
		this._setCurrentNode(preparedSongId, this._preparedSongNode);
	},
	
	_cacheFirstSongIfNoAny: function()
	{
		if (this._preparedSongId === null && this._currentSongId === null)
		{
			if (typeof this._mainInstance._songStack[1] == 'undefined')
			{
				return false;
				
			}

			this._setForPrepare(1);

			return true;
		}

		return false;
	},
	
	_resetCurrent: function()
	{
		if (this._mainInstance.getCurrentSongId() !== null)
		{
			this._currentTimeNode.html(this._mainInstance.getCurrentSongInfo()['duration']);
			this._currentProgressNode.css('backgroundPosition', Config._progressBarBgPosition[0] + 'px ' +  Config._progressBarBgPosition[1]  + 'px');
		}
		
		this._setCurrentNode(null, null);
	},
	
	updatePosition: function(position, duration)
	{
		if (this._mainInstance.getCurrentSongId() !== null)
		{
			if (this._progressBarWidth === null)
			{
				this._progressBarWidth = this._playListNode.find('.progress:first').outerWidth();
			}
			
			var newPosition = (Config._progressBarBgPosition[0] + Math.round(this._progressBarWidth * position / duration));
			this._currentProgressNode.css('backgroundPosition', newPosition + 'px ' + Config._progressBarBgPosition[1]  + 'px');
			this._currentTimeNode.html(this._calculateDuration(position));
		}
	},
	
	_calculateDuration: function(position)
	{
		var second = Number(position.substr(0, position.length - 3)), 
			minute = intval(second / 60);
		
		second = second % 60;
		
		return (minute <= 9 ? '0' + minute : minute) + ':' + (second <= 9 ? '0' + second : second);
	},
	
	_restoreScroll: function(node)
	{
		var ey = node.position().top,
			eh = node.outerHeight(),
			st = this._playListNode.scrollTop(),
			cy = this._playListNode.position().top,
			ch = this._playListNode.attr('scrollHeight') - this._playListNode.outerHeight(),
			dc = cy + this._playListNode.outerHeight(),
			r = null;
		if (ey < cy)
		{
			r = st - (cy - ey);
			
		}
		else if (ey > dc)
		{
			r = st + eh + (ey - dc);
		}
		
		if (r !== null)
		{
			this._playListNode.scrollTop(Math.max(r, 0));
			this._scrollBarNode.css({top: Math.max(0, Math.round(r * this._getScrollBarHeight() / ch)) + 'px'});
		}
	},
	
	_getScrollBarHeight: function()
	{
		if (this._scrollBarHeight === null)
		{
			this._scrollBarHeight = this._scrollBarNode.parent().innerHeight() - this._scrollBarNode.outerHeight();
		}
		
		return this._scrollBarHeight;
	},
	
	_animate: function(node, properties, duration, easing, complete)
	{
		this._animRunning = true;
		var _this = this;
		node.animate(properties, duration, easing, function()
		{
			_this._animRunning = false;
			if ($.isFunction(complete))
			{
				complete.call();
			}
		});
	},
	
	_checkFlash: function()
	{
		if (!this._mainInstance._flashReady)
		{
			alert(FLASH_ERROR);
			return false;
		}
		
		return true;
	}
};

function WB_Mp3Player()
{
	this.__construct.apply(this, arguments);
}

WB_Mp3Player.prototype = 
{
	_containerNode: null,
	
	_flashPlayerNode: null,
	_flashPlayerRaw: null,
	
	_interfaceController: null,
	
	_songIndex: 0,
	
	_songStack: [],
	_suffleList: [],
	_suffleIndex: 0,
	
	_preparedSongId: null,
	_currentSongId: null,
	
	_flashReady: false,
	
	_paused: false,

	__construct: function(containerNode, resourceData)
	{
		this._containerNode = $(containerNode);
		this._buildPlayer();
		
		this.buildPlayList(Config.resourceType, resourceData);
	},
	
	_buildPlayer: function()
	{
		this._flashPlayerNode = this._containerNode.flashembed(
			{
				src: Config.flashPlayerPath, 
				expressInstall: true,
				width: '1',
				height: '1',
				onFail: this._flashLoadFail,
				wmode: 'opaque',
				id: LISTENERNAME + '_Flash'
			},
			{
				// enabled: 'true',
				listener: LISTENERNAME, 
				interval: Config.updateTimer
			}
		);
		
		this._flashPlayerRaw = this._flashPlayerNode.data('flashembed').getApi();
		this._interfaceController = new WB_Mp3Player_InterfaceController(this);
	},
	
	buildPlayList: function(resourceType, resourceData)
	{
		resourceData = resourceData || null;
		resourceType = resourceType.toLowerCase();

		switch (resourceType)
		{
			case 'xml':
				$.get(resourceData || '/', bindContext(this._playListBuildByXml, this), 'xml');
			break;
			
			case 'remoteJson':
				$.getJSON(resourceData || '/', bindContext(this._playListBuildByJson, this));
			break;
			
			case 'localJson':
				this._playListBuildByJson(resourceData);
			break;
		}
	},
	
	_playListBuildByXml: function(xml)
	{
		var xmlMain = $(xml), _instance = this;
		if (!xmlMain.find('playList'))
		{
			return false;
		}
		
		xmlMain.find('song').each(function()
		{
			var songNode = $(this);
			_instance.insertSong(songNode.text(), songNode.attr('duration'), songNode.attr('url'));
		});
		
		this._initPlayList();
		
		return true;
	},
	
	_playListBuildByJson: function(data)
	{
		if (!resourceData || typeof resourceData.playList == 'undefined')
		{
			return false;
		}
		
		for (var songNode in data.playList)
		{
			this.insertSong(songNode.title, songNode.duration, songNode.url);
		}
		
		this._initPlayList();
		
		return true;
	},
	
	getSongInfoById: function(songId)
	{
		if (songId === null)
		{
			return {};
		}
		
		return this._songStack[songId];
	},
	
	getCurrentSongId: function()
	{
		return this._currentSongId;
	},
	
	setCurrentSongId: function(index)
	{
		this._currentSongId = index;
	},
	
	getCurrentSongInfo: function()
	{
		return this.getSongInfoById(this.getCurrentSongId());
	},
	
	getPreparedSongId: function()
	{
		return this._preparedSongId;
	},
	
	setPreparedSongId: function(index)
	{
		this._preparedSongId = index;
	},
	
	getPreparedSongInfo: function()
	{
		return this.getSongInfoById(this.getPreparedSongId());
	},
	
	insertSong: function(title, duration, url)
	{
		this._songStack[++this._songIndex] = {title: title, duration: duration, url: url};
		this._interfaceController.appendSong(this._songIndex, title, duration);
		
		if (Config.suffle)
		{
			this._suffleList[this._suffleList.length] = this._songIndex;
		}
	},
	
	_setCurrentSongData: function(variable, data)
	{
		if (typeof CurrentSongData[variable] != 'undefined')
		{
			CurrentSongData[variable] = data;
		}
		
		consoleLog('WB_Mp3Player :: _setCurrentSongData  %s :: %s', variable, data);
	},
	
	_playerInit: function()
	{
		consoleLog('WB_Mp3Player :: _playerInit');
		
		this._flashReady = true;
		this.setVolume(Config.volume);
	},
	
	_playerUpdate: function()
	{
		if (this._currentSongId !== null)
		{
			var duration = CurrentSongData['duration'];
			duration = CurrentSongData['bytesTotal'] * duration / CurrentSongData['bytesLoaded'];
			
			this._interfaceController.updatePosition(CurrentSongData['position'], duration);
			if (CurrentSongData['position'] == 0 && CurrentSongData['bytesPercent'] == 100)
			{
				this._interfaceController._next();
				if (Config.repeat || this._preparedSongId != this._interfaceController._firstNode.data('songIndex'))
				{
					this._interfaceController._setPreparedToCurrent();
					this._interfaceController._mainInstance._play();
				}
			}
		}
		
		consoleLog('WB_Mp3Player :: Player Update');
	},
	
	play: function(songId)
	{
		this._interfaceController._play(this._interfaceController._playControlNode, songId || null);
	},
	
	pause: function()
	{
		this._interfaceController._pause();
	},
	
	stop: function()
	{
		this._interfaceController._stop();
	},
	
	next: function()
	{
		this._paused = false;
		this._interfaceController._next();
	},
	
	prev: function()
	{
		this._paused = false;
		this._interfaceController._prev();
	},
	
	setVolume: function(volume)
	{
		this._interfaceController._setVolume(volume);
	},
	
	_play: function()
	{
		var songInfo = this.getCurrentSongInfo();
		
		consoleLog('WB_Mp3Player :: Play  %s :: %s :: %s', songInfo.id, songInfo.title, songInfo.url);

		this._flashPlayerRaw.SetVariable('enabled', 'true'); 
		
		if (!this._paused)
		{
			this._flashPlayerRaw.SetVariable('method:setUrl', songInfo.url);
		}
		else
		{
			this._paused = false;
		}
		
		this._flashPlayerRaw.SetVariable('method:play', '');
	},
	
	_pause: function()
	{
		this._paused = true;
		
		consoleLog('WB_Mp3Player :: Pause');
		
		this._flashPlayerRaw.SetVariable('enabled', 'false');
		this._flashPlayerRaw.SetVariable('method:pause', '');
	},
	
	_stop: function()
	{
		this._paused = false;
		
		consoleLog('WB_Mp3Player :: Stop');
		
		this._flashPlayerRaw.SetVariable('enabled', 'false');
		this._flashPlayerRaw.SetVariable('method:stop', '');
	},
	
	_setVolume: function(volume)
	{
		consoleLog('WB_Mp3Player :: setVolume = %s', volume);
		
		this._flashPlayerRaw.SetVariable('method:setVolume', volume);
	},
	
	_initPlayList: function()
	{
		if (this._songIndex > 0)
		{
			this._interfaceController._setForPrepare(1);
		}
		
		this._interfaceController._bindScrollBar();
	},
	
	_createSuffleList: function()
	{
		if (this._songIndex > 0)
		{
			var suffleList = new Array(), 
				reverseSearch = false,
				randMaxNumber = this._songIndex - 1;
				
			for (var i = 1; i <= this._songIndex; i++)
			{
				if (this._currentSongId == i)
				{
					suffleList[0] = i; // aktif çalan parça her zaman bir numara...
				}
				else
				{
					var randIndex = rand(0, randMaxNumber);
					if (typeof suffleList[randIndex] == 'undefined')
					{
						suffleList[randIndex] = i;
					}
					else
					{
						while (true)
						{
							if (reverseSearch)
							{
								randIndex--;
							}
							else
							{
								randIndex++;
							}
							
							if (randIndex > randMaxNumber)
							{
								randIndex = 0;
							}
							else if (randIndex < 0)
							{
								randIndex = randMaxNumber;
							}
							
							if (typeof suffleList[randIndex] == 'undefined')
							{
								suffleList[randIndex] = i;
								break;
							}
						}
						
						reverseSearch = !reverseSearch;
					}
				}
			}

			this._suffleIndex = 0;
			this._suffleList = suffleList;
		}
	},
	
	_resetSuffleList: function()
	{
		this._suffleList = [];
		
		consoleLog('WB_Mp3Player :: karıştırma listesi sıfırlandı.');
	},
	
	_flashLoadFail: function()
	{
		FLASH_ERROR = ERROR_LOAD_FAIL;
		consoleLog('WB_Mp3Player :: flash yüklemesi başarısız oldu.');
	},
	
	toString: function()
	{
		return 'WB_Mp3Player';
	}
};

$.fn.wbMp3Player = function(resourceData, config)
{
	if (!window.WB_Mp3Player_Instance)
	{
		var node = this[0];
		if (!node)
		{
			return false;
		}

		Config = $.extend(true, {}, Config, config);

		window.WB_Mp3Player_Instance = new WB_Mp3Player(node, resourceData);
	}
	
	return window.WB_Mp3Player_Instance;
};

	
})();