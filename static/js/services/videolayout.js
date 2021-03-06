/*
 * Spreed WebRTC.
 * Copyright (C) 2013-2014 struktur AG
 *
 * This file is part of Spreed WebRTC.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 */

"use strict";
define(["jquery", "underscore", "modernizr", "injectCSS"], function($, _, Modernizr) {

	var dynamicCSSContainer = "audiovideo-dynamic";
	var renderers = {};

	var getRemoteVideoSize = function(videos, streams) {
		var size = {
			width: 1920,
			height: 1080
		}
		if (videos.length) {
			if (videos.length === 1) {
				var remoteVideo = streams[videos[0]].element.find("video")[0];
				if (remoteVideo) {
					size.width = remoteVideo.videoWidth;
					size.height = remoteVideo.videoHeight;
					console.log("Remote video size: ", size);
				}
			}
		}
		return size;
	}

	var objectFitSupport = Modernizr["object-fit"] && true;

	// videoLayout
	return ["$window", function($window) {

		// Video layout with all videos rendered the same size.
		var OnePeople = function(container, scope, controller) {};

		OnePeople.prototype.name = "onepeople";

		OnePeople.prototype.render = function(container, size, scope, videos, streams) {

			if (this.closed) {
				return;
			}

			var videoWidth;
			var videoHeight;

			if (videos.length) {
				var remoteSize = getRemoteVideoSize(videos, streams);
				videoWidth = remoteSize.width;
				videoHeight = remoteSize.height;
			}

			if (!videoWidth) {
				// XXX(longsleep): Improve this condition - its crap to compare style opacity (tm)!
				if (scope.localVideo.style.opacity === '1') {
					videoWidth = scope.localVideo.videoWidth;
					videoHeight = scope.localVideo.videoHeight;
					console.log("Local video size: ", videoWidth, videoHeight);
					videos = [null];
				}
			}

			if (!videos.length) {
				return;
			}

			if (!videoWidth) {
				videoWidth = 640;
			}
			if (!videoHeight) {
				videoHeight = 360;
			}

			if (this.countSelfAsRemote) {
				videos.unshift(null);
			}

			var aspectRatio = videoWidth / videoHeight;
			var innerHeight = size.height;
			var innerWidth = size.width;

			//console.log("resize", innerHeight, innerWidth);
			//console.log("resize", container, videos.length, aspectRatio, innerHeight, innerWidth);
			var extraCSS = {};

			if (!objectFitSupport) {
				// Make mini video fit into available space on browsers with no object-fit support.
				// http://caniuse.com/object-fit
				var aspectRatioLocal = scope.localVideo.videoWidth / scope.localVideo.videoHeight;
				extraCSS = {};
				extraCSS[".renderer-"+this.name+" .miniVideo"] = {
					width: ($(scope.mini).height() * aspectRatioLocal) + "px"
				};
			}

			if (videos.length === 1) {
				var newVideoWidth = innerWidth < aspectRatio * innerHeight ? innerWidth : aspectRatio * innerHeight;
				var newVideoHeight = innerHeight < innerWidth / aspectRatio ? innerHeight : innerWidth / aspectRatio;
				container.style.width = newVideoWidth + 'px';
				container.style.left = ((innerWidth - newVideoWidth) / 2) + 'px';
			} else {
				var space = innerHeight * innerWidth; // square pixels
				var videoSpace = space / videos.length;
				var singleVideoWidthOptimal = Math.pow(videoSpace * aspectRatio, 0.5);
				var videosPerRow = Math.ceil(innerWidth / singleVideoWidthOptimal);
				if (videosPerRow > videos.length) {
					videosPerRow = videos.length;
				}
				var singleVideoWidth = Math.ceil(innerWidth / videosPerRow);
				var singleVideoHeight = Math.ceil(singleVideoWidth / aspectRatio);
				var newContainerWidth = (videosPerRow * singleVideoWidth);
				var newContainerHeight = Math.ceil(videos.length / videosPerRow) * singleVideoHeight;
				if (newContainerHeight > innerHeight) {
					var tooHigh = (newContainerHeight - innerHeight) / Math.ceil(videos.length / videosPerRow);
					singleVideoHeight -= tooHigh;
					singleVideoWidth = singleVideoHeight * aspectRatio;
				}
				/*
                console.log("space", space);
                console.log("videospace", videoSpace);
                console.log("singleVideoWidthOptimal", singleVideoWidthOptimal);
                console.log("videosPerRow", videosPerRow);
                console.log("singleVideoWidth", singleVideoWidth);
                console.log("singleVideoHeight", singleVideoHeight);
                */
				container.style.width = newContainerWidth + "px";
				container.style.left = ((innerWidth - newContainerWidth) / 2) + 'px';
				var extraCSS2 = {};
				extraCSS2[".renderer-"+this.name+" .remoteVideos"] = {
					">div": {
						width: singleVideoWidth + "px",
						height: singleVideoHeight + "px"
					}
				};
				extraCSS = $.extend(extraCSS, extraCSS2);
			}
			$.injectCSS(extraCSS, {
				truncateFirst: true,
				containerName: dynamicCSSContainer,
				useRawValues: true
			});

		};

		OnePeople.prototype.close = function(container, scope, controller) {

			this.closed = true;

		};


		// Smally inherits from OnePeople
		var Smally = function(container, scope, controller) {
			// Call super.
			OnePeople.call(this, container, scope, controller);
		}
		Smally.prototype = Object.create(OnePeople.prototype);
		Smally.prototype.constructor = Smally;
		Smally.prototype.name = "smally";


		// Democrazy inherits from OnePeople
		var Democrazy = function(container, scope, controller) {
			// Call super.
			OnePeople.call(this, container, scope, controller);
			// Move mini video into remoteVideos.
			var $mini = $(scope.mini);
			this.miniParent = $mini.parent();
			$mini.prependTo(scope.remoteVideos);
			$mini.find("video")[0].play();
			this.countSelfAsRemote = true;
		}
		Democrazy.prototype = Object.create(OnePeople.prototype);
		Democrazy.prototype.constructor = Democrazy;
		Democrazy.prototype.name = "democrazy";
		Democrazy.prototype.close = function(container, scope, controller) {
			OnePeople.prototype.close.call(this, container, scope, controller);
			var $mini = $(scope.mini);
			$mini.appendTo(this.miniParent);
			$mini.find("video")[0].play();
			this.miniParent = null;
		};


		// A view with one selectable large video. The others are small.
		var ConferenceKiosk = function(container, scope, controller) {

			this.remoteVideos = $(container).find(".remoteVideos");
			this.bigVideo = $("<div>").addClass("bigVideo")[0];
			this.remoteVideos.before(this.bigVideo);

			this.big = null;
			this.remoteVideos.on("click", ".remoteVideo", _.bind(function(event) {
				if ($(event.currentTarget).hasClass("remoteVideo")) {
					event.stopPropagation();
					this.makeBig($(event.currentTarget));
				}
			}, this));

		};

		ConferenceKiosk.prototype.name = "conferencekiosk";

		ConferenceKiosk.prototype.makeBig = function(remoteVideo) {

			if (this.big === remoteVideo) {
				return;
			}

			if (this.big) {
				// Add old video back.
				this.big.insertAfter(remoteVideo);
				this.big.find("video")[0].play();
			}

			this.big = remoteVideo;
			remoteVideo.appendTo(this.bigVideo);
			remoteVideo.find("video")[0].play();

		};

		ConferenceKiosk.prototype.render = function(container, size, scope, videos, streams) {

			var big = this.big;
			if (big) {
				var currentbigpeerid = this.big.data("peerid");
				if (!streams[currentbigpeerid]) {
					console.log("Current big peer is no longer there", currentbigpeerid);
					this.big = big = null;
				}
			}
			if (!big) {
				if (videos.length) {
					this.makeBig(streams[videos[0]].element);
					this.bigVideo.style.opacity = 1;
				}

			}

			var remoteSize = getRemoteVideoSize(videos, streams);
			var aspectRatio = remoteSize.width / remoteSize.height;
			var innerHeight = size.height - 110;
			var innerWidth = size.width;
			var extraCSS = {};

			var bigVideoWidth = innerWidth < aspectRatio * innerHeight ? innerWidth : aspectRatio * innerHeight;
			var bigVideoHeight = innerHeight < innerWidth / aspectRatio ? innerHeight : innerWidth / aspectRatio;

			this.bigVideo.style.width = bigVideoWidth + 'px';
			this.bigVideo.style.height = bigVideoHeight + 'px';

			// Make space for own video on the right if width goes low.
			if (((size.width - (videos.length - 1) * 192) / 2) < 192) {
				extraCSS = {};
				extraCSS[".renderer-"+this.name+" .remoteVideos"] = {
					"margin-right": "192px",
					"overflow-x": "auto",
					"overflow-y": "hidden"
				};
			}

			$.injectCSS(extraCSS, {
				truncateFirst: true,
				containerName: dynamicCSSContainer,
				useRawValues: true
			});

		};

		ConferenceKiosk.prototype.close = function(container, scope, controller) {
			this.closed = true;
			if (this.big) {
				this.remoteVideos.append(this.big);
				this.big.find("video")[0].play();
			}
			this.big = null;
			this.bigVideo.remove()
			this.bigVideo = null;
			this.remoteVideos = null;
		};


		// Auditorium inherits from ConferenceKiosk
		var Auditorium = function(container, scope, controller) {
			// Call super.
			ConferenceKiosk.call(this, container, scope, controller);
		}
		Auditorium.prototype = Object.create(ConferenceKiosk.prototype);
		Auditorium.prototype.constructor = Auditorium;
		Auditorium.prototype.name = "auditorium";
		Auditorium.prototype.render = function(container, size, scope, videos, streams) {
			var big = this.big;
			if (big) {
				var currentbigpeerid = this.big.data("peerid");
				if (!streams[currentbigpeerid]) {
					console.log("Current big peer is no longer there", currentbigpeerid);
					this.big = big = null;
				}
			}
			if (!big) {
				if (videos.length) {
					this.makeBig(streams[videos[0]].element);
					this.bigVideo.style.opacity = 1;
				}

			}
		};

		// Register renderers.
		renderers[OnePeople.prototype.name] = OnePeople;
		renderers[Smally.prototype.name] = Smally;
		renderers[Democrazy.prototype.name] = Democrazy;
		renderers[ConferenceKiosk.prototype.name] = ConferenceKiosk;
		renderers[Auditorium.prototype.name] = Auditorium;

		// Public api.
		var current = null;
		var body = $("body");
		return {
			update: function(name, size, scope, controller) {

				var makeName = function(prefix, n, camel) {
					var r = prefix;
					if (camel) {
						r = r + n.charAt(0).toUpperCase() + n.slice(1);
					} else {
						r = r + "-" + n;
					}
					return r;
				};

				var videos = _.keys(controller.streams);
				var streams = controller.streams;
				var container = scope.container;
				var layoutparent = scope.layoutparent;

				if (!current) {
					current = new renderers[name](container, scope, controller)
					//console.log("Created new video layout renderer", name, current);
					$(layoutparent).addClass(makeName("renderer", name));
					$(body).addClass(makeName("videolayout", name, true));
					return true;
				} else {
					if (current.name !== name) {
						current.close(container, scope, controller);
						$(container).removeAttr("style");
						$(layoutparent).removeClass(makeName("renderer", current.name));
						$(body).removeClass(makeName("videolayout", current.name, true));
						current = new renderers[name](container, scope, controller)
						$(layoutparent).addClass(makeName("renderer", name));
						$(body).addClass(makeName("videolayout", name, true));
						//console.log("Switched to new video layout renderer", name, current);
						return true;
					}
				}

				return current.render(container, size, scope, videos, streams);

			},
			register: function(name, impl) {
				renderers[name] = impl;
			},
			layouts: function() {
				return _.keys(renderers);
			}
		}

	}];

});
