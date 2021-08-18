(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('fs'), require('path')) :
  typeof define === 'function' && define.amd ? define(['fs', 'path'], factory) :
  (global = global || self, global.EBNF = factory(global.fs, global.path));
}(this, (function (fs, path) { 'use strict';

  fs = fs && Object.prototype.hasOwnProperty.call(fs, 'default') ? fs['default'] : fs;
  path = path && Object.prototype.hasOwnProperty.call(path, 'default') ? path['default'] : path;

  function ownKeys(object, enumerableOnly) {
    var keys = Object.keys(object);

    if (Object.getOwnPropertySymbols) {
      var symbols = Object.getOwnPropertySymbols(object);

      if (enumerableOnly) {
        symbols = symbols.filter(function (sym) {
          return Object.getOwnPropertyDescriptor(object, sym).enumerable;
        });
      }

      keys.push.apply(keys, symbols);
    }

    return keys;
  }

  function _objectSpread2(target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i] != null ? arguments[i] : {};

      if (i % 2) {
        ownKeys(Object(source), true).forEach(function (key) {
          _defineProperty(target, key, source[key]);
        });
      } else if (Object.getOwnPropertyDescriptors) {
        Object.defineProperties(target, Object.getOwnPropertyDescriptors(source));
      } else {
        ownKeys(Object(source)).forEach(function (key) {
          Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
        });
      }
    }

    return target;
  }

  function _defineProperty(obj, key, value) {
    if (key in obj) {
      Object.defineProperty(obj, key, {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    } else {
      obj[key] = value;
    }

    return obj;
  }

  const traverse = classifier => travelers => transformers => {
    const transform = (node, initialResult = node, parents = []) => {
      const nodeType = classifier(node);

      let transformed = false;
      // Travel
      const traveler = travelers[nodeType];
      const updatedNode = traveler
        ? traveler(node, aNext => {
            const result = transform(aNext, aNext, [node, ...parents]);
            if (result !== aNext) {
              transformed = true;
            }
            return result;
          })
        : initialResult;

      const startResult = transformed ? updatedNode : initialResult;

      // Transform
      return transformers.reduce(
        (res, transformer) =>
          typeof transformer === "function"
            ? transformer(res, node, parents)
            : transformer[nodeType]
              ? transformer[nodeType](res, node, parents)
              : res,
        startResult
      );
    };
    return transform;
  };

  var traverse_1 = { traverse };

  const { traverse: traverse$1 } = traverse_1;

  const NodeTypes = {
    Root: 0,
    Production: 1,
    Comment: 2,
    Terminal: 3,
    NonTerminal: 4,
    Choice: 5,
    Group: 6,
    Sequence: 7,
    Optional: 8,
    Repetition: 9,
    Special: 10,
    ExceptTerminal: 11,
    ExceptNonTerminal: 12
  };

  const identifyNode = node => {
    if (Array.isArray(node)) return NodeTypes.Root;
    if (node.definition) return NodeTypes.Production;
    if (node.choice) return NodeTypes.Choice;
    if (node.group) return NodeTypes.Group;
    if (node.comment) return NodeTypes.Comment;
    if (node.sequence) return NodeTypes.Sequence;
    if (node.optional) return NodeTypes.Optional;
    if (node.repetition) return NodeTypes.Repetition;
    // leafs
    if (node.specialSequence) return NodeTypes.Special;
    if (node.terminal) return NodeTypes.Terminal;
    if (node.nonTerminal) return NodeTypes.NonTerminal;
    if (node.exceptTerminal) return NodeTypes.ExceptTerminal;
    if (node.exceptNonTerminal) return NodeTypes.ExceptNonTerminal;
  };

  const travelers = {
    [NodeTypes.Root]: (node, next) => node.map(next),
    [NodeTypes.Production]: (node, next) => ({
      ...node,
      definition: next(node.definition)
    }),
    [NodeTypes.Choice]: (node, next) => ({
      ...node,
      choice: node.choice.map(next)
    }),
    [NodeTypes.Group]: (node, next) => ({
      ...node,
      group: next(node.group)
    }),
    [NodeTypes.Sequence]: (node, next) => ({
      ...node,
      sequence: node.sequence.map(next)
    }),
    [NodeTypes.Optional]: (node, next) => ({
      ...node,
      optional: next(node.optional)
    }),
    [NodeTypes.Repetition]: (node, next) => ({
      ...node,
      repetition: next(node.repetition)
    })
  };

  const ebnfTransform = traverse$1(identifyNode)(travelers);

  const ebnfOptimizer = transformers => ast => {
    const optimize = ebnfTransform(transformers);
    let current = ast;
    let transformed = optimize(ast);
    while (current !== transformed) {
      current = transformed;
      transformed = optimize(current);
    }
    return transformed;
  };

  var ebnfTransform_1 = {
    ebnfTransform,
    ebnfOptimizer,
    NodeTypes,
    identifyNode,
    travelers
  };

  const { NodeTypes: NodeTypes$1 } = ebnfTransform_1;

  var ungroup = {
    [NodeTypes$1.Group]: (current, node, parents) => {
      if (parents[0].sequence && current.group.choice) {
        return current;
      }
      if (current.comment) {
        return current;
      }
      return current.group;
    },
    [NodeTypes$1.Sequence]: current => {
      if (!current.sequence) return current;
      const hasSubSequence = current.sequence.some(node => node.sequence);
      if (hasSubSequence) {
        return {
          ...current,
          sequence: current.sequence.reduce(
            (items, elem) =>
              elem.sequence ? items.concat(elem.sequence) : items.concat(elem),
            []
          )
        };
      }
      if (current.sequence.length === 1) {
        return current.sequence[0];
      }
      return current;
    },
    [NodeTypes$1.Choice]: current => {
      const hasSubChoice = current.choice.some(node => node.choice);
      if (hasSubChoice) {
        return {
          ...current,
          choice: current.choice.reduce(
            (items, elem) =>
              elem.choice ? items.concat(elem.choice) : items.concat(elem),
            []
          )
        };
      }
      return current;
    }
  };

  const { NodeTypes: NodeTypes$2 } = ebnfTransform_1;

  var deduplicateChoices = {
    [NodeTypes$2.Choice]: current => {
      if (!current.choice) {
        return current;
      }
      const stringChoices = current.choice.map(item => JSON.stringify(item));
      const uniqueDirectChoices = current.choice.filter(
        (item, idx) => !(stringChoices.indexOf(JSON.stringify(item)) < idx)
      );

      const stringChoicesComments = current.choice.map(
        item => (item.group && item.comment ? JSON.stringify(item.group) : null)
      );
      const uniqueChoices = uniqueDirectChoices.filter(
        item =>
          (!item.comment &&
            stringChoicesComments.indexOf(JSON.stringify(item)) === -1) ||
          item.comment
      );

      if (uniqueChoices.length === 1) {
        return current.choice[0];
      }
      if (uniqueChoices.length < current.choice.length) {
        return { ...current, choice: uniqueChoices };
      }
      return current;
    }
  };

  const { NodeTypes: NodeTypes$3 } = ebnfTransform_1;

  var unwrapOptional = {
    [NodeTypes$3.Optional]: current => {
      if (current.optional.optional) {
        return current.optional;
      }
      if (current.optional.repetition && current.optional.skippable) {
        return current.optional;
      }
      return current;
    }
  };

  const { NodeTypes: NodeTypes$4 } = ebnfTransform_1;

  var optionalChoices = {
    [NodeTypes$4.Choice]: current => {
      if (!current.choice) {
        return current;
      }
      const hasOptional = current.choice.some(node => node.optional);
      if (hasOptional) {
        return {
          optional: {
            choice: current.choice.reduce(
              (options, option) =>
                option.optional
                  ? options.concat(option.optional)
                  : options.concat(option),
              []
            )
          }
        };
      }
      return current;
    }
  };

  const { NodeTypes: NodeTypes$5 } = ebnfTransform_1;

  var choiceWithSkip = {
    [NodeTypes$5.Optional]: current => {
      if (!current.optional || !current.optional.choice) {
        return current;
      }
      return {
        choice: [{ skip: true }].concat(
          current.optional.choice
            .filter(node => !node.skip)
            .map(node => (node.repetition ? { ...node, skippable: false } : node))
        )
      };
    },
    [NodeTypes$5.Choice]: current => {
      if (!current.choice) {
        return current;
      }
      const hasSkippableRepetition = current.choice.some(
        node => node.repetition && node.skippable
      );
      if (hasSkippableRepetition) {
        return {
          choice: [{ skip: true }].concat(
            current.choice
              .filter(node => !node.skip)
              .map(
                node => (node.repetition ? { ...node, skippable: false } : node)
              )
          )
        };
      }
      return current;
    }
  };

  const { NodeTypes: NodeTypes$6 } = ebnfTransform_1;

  const equalElements = (first, second) =>
    JSON.stringify(first) === JSON.stringify(second);

  const ungroup$1 = item => (item.group && !item.comment ? item.group : item);

  var repetition = {
    [NodeTypes$6.Sequence]: current => {
      if (!current.sequence) return current;
      const hasRepeats = current.sequence.some(
        item => item.repetition || (item.group && item.group.repetition)
      );
      if (!hasRepeats) return current;

      const optimizeStructure = (item, idx, list) => {
        if (item.repetition && idx > 0) {
          if (!item.repetition.sequence) {
            const lastElem = item.repetition;
            const previousElem = list[idx - 1];
            if (equalElements(ungroup$1(lastElem), ungroup$1(previousElem))) {
              return {
                clearPrevious: 1,
                repetition: ungroup$1(lastElem),
                skippable: false
              };
            }
          } else {
            const subSequence = item.repetition.sequence;
            const matches = [];

            let keepLooking = true;
            let lookBack = 1;
            do {
              const lastSequenceElem = subSequence[subSequence.length - lookBack];
              const previousElem = list[idx - lookBack];

              if (
                lastSequenceElem &&
                previousElem &&
                equalElements(lastSequenceElem, previousElem)
              ) {
                matches.push(lastSequenceElem);
              } else {
                keepLooking = false;
              }
              lookBack++;
            } while (keepLooking);

            if (matches.length > 0) {
              const repeaterSequence = subSequence
                .slice(0, -matches.length)
                .reverse();

              const resultObject = {
                clearPrevious: matches.length,
                repetition: { sequence: matches.reverse() },
                skippable: false
              };

              if (repeaterSequence.length > 0) {
                const repeater =
                  repeaterSequence.length > 1
                    ? { sequence: repeaterSequence }
                    : repeaterSequence[0];
                resultObject.repeater = repeater;
              }
              return resultObject;
            }
          }
        }
        return item;
      };

      const vacuumResults = (elem, index, list) => {
        if (!elem) return false;
        let ahead = 1;
        if (elem.clearPrevious) {
          delete elem["clearPrevious"];
        }
        while (list[ahead + index] !== undefined) {
          const item = list[ahead + index];
          if (item.clearPrevious && item.clearPrevious >= ahead) {
            return false;
          }
          ahead += 1;
        }
        return true;
      };

      const optimizedSequence = {
        ...current,
        sequence: current.sequence
          // pass 1: unpack comments
          .map(
            item =>
              item.comment && item.group && !item.group.optional
                ? item.before
                  ? [{ comment: item.comment }, item.group]
                  : [item.group, { comment: item.comment }]
                : [item]
          )
          .reduce((acc, item) => acc.concat(item), [])
          // pass 2: optimize structure
          .map(optimizeStructure)
          .filter(vacuumResults)
          .map(elem => (elem.sequence ? elem.sequence : [elem]))
          .reduce((acc, elem) => acc.concat(elem), [])
      };
      if (equalElements(optimizedSequence, current)) {
        return current;
      }

      return optimizedSequence.sequence.length == 1
        ? optimizedSequence.sequence[0]
        : optimizedSequence;
    }
  };

  const { NodeTypes: NodeTypes$7 } = ebnfTransform_1;

  const skipFirst = list =>
    [
      list.some(e => e === "skip" || e.skip) && { skip: true },
      ...list.filter(e => e !== "skip" && !e.skip)
    ].filter(Boolean);

  const equalElements$1 = (first, second) =>
    JSON.stringify(first) === JSON.stringify(second);

  var choiceClustering = {
    [NodeTypes$7.Choice]: current => {
      if (!current.choice) return current;

      const isCertain = elem =>
        (elem.terminal && elem) || (elem.nonTerminal && elem);

      const groupElements = elements => {
        const allSet = elements.every(f => f);
        if (!allSet) return {};
        return elements.reduce((acc, elem) => {
          const key = JSON.stringify(elem);
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {});
      };
      const countSame = groupElements => {
        const amounts = Object.values(groupElements);
        return Math.max(...amounts);
      };

      const collectCertainFirstElements = current.choice.map(
        elem => isCertain(elem) || (elem.sequence && isCertain(elem.sequence[0]))
      );
      const collectCertainLastElements = current.choice.map(
        elem =>
          isCertain(elem) ||
          (elem.sequence && isCertain(elem.sequence[elem.sequence.length - 1]))
      );
      const groupFirsts = groupElements(collectCertainFirstElements);
      const groupLasts = groupElements(collectCertainLastElements);

      // most wins, optimize, repeat
      const maxFirstsEqual = countSame(groupFirsts);
      const maxLastsEqual = countSame(groupLasts);
      if (Math.max(maxFirstsEqual, maxLastsEqual) > 1) {
        const beforeChoices = [];
        const afterChoices = [];
        if (maxFirstsEqual >= maxLastsEqual) {
          const firstElement = Object.entries(groupFirsts).find(
            ([, value]) => value === maxFirstsEqual
          )[0];

          // now filter all choices that have this as first element, placing
          // the others in 'leftOverChoices'
          let hasEmpty = false;
          let found = false;
          const newChoices = collectCertainFirstElements
            .map((elem, index) => {
              // if not match, add production choice to leftOverChoices.
              if (JSON.stringify(elem) === firstElement) {
                found = true;
                // strip off element of chain.
                const choice = current.choice[index];
                if (choice.sequence) {
                  return { ...choice, sequence: choice.sequence.slice(1) };
                } else {
                  hasEmpty = true;
                }
              } else {
                (found ? afterChoices : beforeChoices).push(
                  current.choice[index]
                );
              }
            })
            .filter(Boolean);
          const newElements = [
            JSON.parse(firstElement),
            newChoices.length > 0 &&
              hasEmpty && {
                optional:
                  newChoices.length == 1 ? newChoices[0] : { choice: newChoices }
              },
            newChoices.length > 0 &&
              !hasEmpty &&
              (newChoices.length == 1 ? newChoices[0] : { choice: newChoices })
          ].filter(Boolean);
          const replacementElement =
            newElements.length > 1 ? { sequence: newElements } : newElements[0];

          const finalResult =
            beforeChoices.length + afterChoices.length > 0
              ? {
                  choice: []
                    .concat(beforeChoices)
                    .concat(replacementElement)
                    .concat(afterChoices)
                }
              : replacementElement;

          return finalResult;
        } else {
          const lastElement = Object.entries(groupLasts).find(
            ([, value]) => value === maxLastsEqual
          )[0];

          // now filter all choices that have this as first element, placing
          // the others in 'leftOverChoices'
          let hasEmpty = false;
          let found = false;
          const newChoices = collectCertainLastElements
            .map((elem, index) => {
              // if not match, add production choice to leftOverChoices.
              if (JSON.stringify(elem) === lastElement) {
                found = true;
                // strip off element of chain.
                const choice = current.choice[index];
                if (choice.sequence) {
                  return { ...choice, sequence: choice.sequence.slice(0, -1) };
                } else {
                  hasEmpty = true;
                }
              } else {
                (found ? afterChoices : beforeChoices).push(
                  current.choice[index]
                );
              }
            })
            .filter(Boolean);
          const newElements = [
            newChoices.length > 0 &&
              hasEmpty && {
                optional:
                  newChoices.length == 1 ? newChoices[0] : { choice: newChoices }
              },
            newChoices.length > 0 &&
              !hasEmpty &&
              (newChoices.length == 1 ? newChoices[0] : { choice: newChoices }),
            JSON.parse(lastElement)
          ].filter(Boolean);
          const replacementElement =
            newElements.length > 1 ? { sequence: newElements } : newElements[0];

          const finalResult =
            beforeChoices.length + afterChoices.length > 0
              ? {
                  choice: []
                    .concat(beforeChoices)
                    .concat(replacementElement)
                    .concat(afterChoices)
                }
              : replacementElement;

          return finalResult;
        }
      }

      // Merge remaining choices
      const result = {
        ...current,
        choice: skipFirst(
          current.choice
            .map(item => {
              const optimizedItem = item;
              if (optimizedItem.choice) {
                return optimizedItem.choice;
              } else {
                return [optimizedItem];
              }
            })
            .reduce((acc, item) => acc.concat(item), [])
        )
      };
      if (equalElements$1(result, current)) {
        return current;
      }
      return result;
    }
  };

  const { ebnfOptimizer: ebnfOptimizer$1 } = ebnfTransform_1;








  const optimizeAST = ebnfOptimizer$1([
    ungroup,
    deduplicateChoices,
    unwrapOptional,
    optionalChoices,
    choiceWithSkip,
    repetition,
    choiceClustering
  ]);

  const optimizeText = ebnfOptimizer$1([
    ungroup,
    deduplicateChoices,
    unwrapOptional,
    optionalChoices
  ]);

  var structureOptimizer = {
    optimizeAST,
    optimizeText
  };

  var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

  function commonjsRequire () {
  	throw new Error('Dynamic requires are not currently supported by rollup-plugin-commonjs');
  }

  function createCommonjsModule(fn, module) {
  	return module = { exports: {} }, fn(module, module.exports), module.exports;
  }

  var railroadDiagrams = createCommonjsModule(function (module, exports) {
  /*
  Railroad Diagrams
  by Tab Atkins Jr. (and others)
  http://xanthir.com
  http://twitter.com/tabatkins
  http://github.com/tabatkins/railroad-diagrams

  This document and all associated files in the github project are licensed under CC0: http://creativecommons.org/publicdomain/zero/1.0/
  This means you can reuse, remix, or otherwise appropriate this project for your own use WITHOUT RESTRICTION.
  (The actual legal meaning can be found at the above link.)
  Don't ask me for permission to use any part of this project, JUST USE IT.
  I would appreciate attribution, but that is not required by the license.
  */

  /*
  This file uses a module pattern to avoid leaking names into the global scope.
  Should be compatible with AMD, CommonJS, and plain ol' browser JS.

  As well, several configuration constants are passed into the module function at the bottom of this file.
  At runtime, these constants can be found on the Diagram class,
  and can be changed before creating a Diagram.
  */

  (function(options) {
  	var funcs = {};

  	function subclassOf(baseClass, superClass) {
  		baseClass.prototype = Object.create(superClass.prototype);
  		baseClass.prototype.$super = superClass.prototype;
  	}

  	function unnull(/* children */) {
  		return [].slice.call(arguments).reduce(function(sofar, x) { return sofar !== undefined ? sofar : x; });
  	}

  	function determineGaps(outer, inner) {
  		var diff = outer - inner;
  		switch(Diagram.INTERNAL_ALIGNMENT) {
  			case 'left': return [0, diff];			case 'right': return [diff, 0];			case 'center':
  			default: return [diff/2, diff/2];		}
  	}

  	function wrapString(value) {
  		return value instanceof FakeSVG ? value : new Terminal(""+value);
  	}

  	function sum(iter, func) {
  		if(!func) func = function(x) { return x; };
  		return iter.map(func).reduce(function(a,b){return a+b}, 0);
  	}

  	function max(iter, func) {
  		if(!func) func = function(x) { return x; };
  		return Math.max.apply(null, iter.map(func));
  	}

  	function* enumerate(iter) {
  		var count = 0;
  		for(const x of iter) {
  			yield [count, x];
  			count++;
  		}
  	}

  	var SVG = funcs.SVG = function SVG(name, attrs, text) {
  		attrs = attrs || {};
  		text = text || '';
  		var el = document.createElementNS("http://www.w3.org/2000/svg",name);
  		for(var attr in attrs) {
  			if(attr === 'xlink:href')
  				el.setAttributeNS("http://www.w3.org/1999/xlink", 'href', attrs[attr]);
  			else
  				el.setAttribute(attr, attrs[attr]);
  		}
  		el.textContent = text;
  		return el;
  	};

  	var FakeSVG = funcs.FakeSVG = function FakeSVG(tagName, attrs, text){
  		if(!(this instanceof FakeSVG)) return new FakeSVG(tagName, attrs, text);
  		if(text) this.children = text;
  		else this.children = [];
  		this.tagName = tagName;
  		this.attrs = unnull(attrs, {});
  		return this;
  	};
  	FakeSVG.prototype.format = function(x, y, width) {
  		// Virtual
  	};
  	FakeSVG.prototype.addTo = function(parent) {
  		if(parent instanceof FakeSVG) {
  			parent.children.push(this);
  			return this;
  		} else {
  			var svg = this.toSVG();
  			parent.appendChild(svg);
  			return svg;
  		}
  	};
  	FakeSVG.prototype.escapeString = function(string) {
  		// Escape markdown and HTML special characters
  		return string.replace(/[*_\`\[\]<&]/g, function(charString) {
  			return '&#' + charString.charCodeAt(0) + ';';
  		});
  	};
  	FakeSVG.prototype.toSVG = function() {
  		var el = SVG(this.tagName, this.attrs);
  		if(typeof this.children == 'string') {
  			el.textContent = this.children;
  		} else {
  			this.children.forEach(function(e) {
  				el.appendChild(e.toSVG());
  			});
  		}
  		return el;
  	};
  	FakeSVG.prototype.toString = function() {
  		var str = '<' + this.tagName;
  		var group = this.tagName == "g" || this.tagName == "svg";
  		for(var attr in this.attrs) {
  			str += ' ' + attr + '="' + (this.attrs[attr]+'').replace(/&/g, '&amp;').replace(/"/g, '&quot;') + '"';
  		}
  		str += '>';
  		if(group) str += "\n";
  		if(typeof this.children == 'string') {
  			str += FakeSVG.prototype.escapeString(this.children);
  		} else {
  			this.children.forEach(function(e) {
  				str += e;
  			});
  		}
  		str += '</' + this.tagName + '>\n';
  		return str;
  	};
  	FakeSVG.prototype.walk = function(cb) {
  		cb(this);
  	};

  	var Path = funcs.Path = function Path(x,y) {
  		if(!(this instanceof Path)) return new Path(x,y);
  		FakeSVG.call(this, 'path');
  		this.attrs.d = "M"+x+' '+y;
  	};
  	subclassOf(Path, FakeSVG);
  	Path.prototype.m = function(x,y) {
  		this.attrs.d += 'm'+x+' '+y;
  		return this;
  	};
  	Path.prototype.h = function(val) {
  		this.attrs.d += 'h'+val;
  		return this;
  	};
  	Path.prototype.right = function(val) { return this.h(Math.max(0, val)); };
  	Path.prototype.left = function(val) { return this.h(-Math.max(0, val)); };
  	Path.prototype.v = function(val) {
  		this.attrs.d += 'v'+val;
  		return this;
  	};
  	Path.prototype.down = function(val) { return this.v(Math.max(0, val)); };
  	Path.prototype.up = function(val) { return this.v(-Math.max(0, val)); };
  	Path.prototype.arc = function(sweep){
  		// 1/4 of a circle
  		var x = Diagram.ARC_RADIUS;
  		var y = Diagram.ARC_RADIUS;
  		if(sweep[0] == 'e' || sweep[1] == 'w') {
  			x *= -1;
  		}
  		if(sweep[0] == 's' || sweep[1] == 'n') {
  			y *= -1;
  		}
  		if(sweep == 'ne' || sweep == 'es' || sweep == 'sw' || sweep == 'wn') {
  			var cw = 1;
  		} else {
  			var cw = 0;
  		}
  		this.attrs.d += "a"+Diagram.ARC_RADIUS+" "+Diagram.ARC_RADIUS+" 0 0 "+cw+' '+x+' '+y;
  		return this;
  	};
  	Path.prototype.arc_8 = function(start, dir) {
  		// 1/8 of a circle
  		const arc = Diagram.ARC_RADIUS;
  		const s2 = 1/Math.sqrt(2) * arc;
  		const s2inv = (arc - s2);
  		let path = "a " + arc + " " + arc + " 0 0 " + (dir=='cw' ? "1" : "0") + " ";
  		const sd = start+dir;
  		const offset =
  			sd == 'ncw'   ? [s2, s2inv] :
  			sd == 'necw'  ? [s2inv, s2] :
  			sd == 'ecw'   ? [-s2inv, s2] :
  			sd == 'secw'  ? [-s2, s2inv] :
  			sd == 'scw'   ? [-s2, -s2inv] :
  			sd == 'swcw'  ? [-s2inv, -s2] :
  			sd == 'wcw'   ? [s2inv, -s2] :
  			sd == 'nwcw'  ? [s2, -s2inv] :
  			sd == 'nccw'  ? [-s2, s2inv] :
  			sd == 'nwccw' ? [-s2inv, s2] :
  			sd == 'wccw'  ? [s2inv, s2] :
  			sd == 'swccw' ? [s2, s2inv] :
  			sd == 'sccw'  ? [s2, -s2inv] :
  			sd == 'seccw' ? [s2inv, -s2] :
  			sd == 'eccw'  ? [-s2inv, -s2] :
  			sd == 'neccw' ? [-s2, -s2inv] : null
  		;
  		path += offset.join(" ");
  		this.attrs.d += path;
  		return this;
  	};
  	Path.prototype.l = function(x, y) {
  		this.attrs.d += 'l'+x+' '+y;
  		return this;
  	};
  	Path.prototype.format = function() {
  		// All paths in this library start/end horizontally.
  		// The extra .5 ensures a minor overlap, so there's no seams in bad rasterizers.
  		this.attrs.d += 'h.5';
  		return this;
  	};


  	var DiagramMultiContainer = funcs.DiagramMultiContainer = function DiagramMultiContainer(tagName, items, attrs, text) {
  		FakeSVG.call(this, tagName, attrs, text);
  		this.items = items.map(wrapString);
  	};
  	subclassOf(DiagramMultiContainer, FakeSVG);
  	DiagramMultiContainer.prototype.walk = function(cb) {
  		cb(this);
  		this.items.forEach(x=>w.walk(cb));
  	};


  	var Diagram = funcs.Diagram = function Diagram(items) {
  		if(!(this instanceof Diagram)) return new Diagram([].slice.call(arguments));
  		DiagramMultiContainer.call(this, 'svg', items, {class: Diagram.DIAGRAM_CLASS});
  		if(!(this.items[0] instanceof Start)) {
  			this.items.unshift(new Start());
  		}
  		if(!(this.items[this.items.length-1] instanceof End)) {
  			this.items.push(new End());
  		}
  		this.up = this.down = this.height = this.width = 0;
  		for(var i = 0; i < this.items.length; i++) {
  			var item = this.items[i];
  			this.width += item.width + (item.needsSpace?20:0);
  			this.up = Math.max(this.up, item.up - this.height);
  			this.height += item.height;
  			this.down = Math.max(this.down - item.height, item.down);
  		}
  		this.formatted = false;
  	};
  	subclassOf(Diagram, DiagramMultiContainer);
  	for(var option in options) {
  		Diagram[option] = options[option];
  	}
  	Diagram.prototype.format = function(paddingt, paddingr, paddingb, paddingl) {
  		paddingt = unnull(paddingt, 20);
  		paddingr = unnull(paddingr, paddingt, 20);
  		paddingb = unnull(paddingb, paddingt, 20);
  		paddingl = unnull(paddingl, paddingr, 20);
  		var x = paddingl;
  		var y = paddingt;
  		y += this.up;
  		var g = FakeSVG('g', Diagram.STROKE_ODD_PIXEL_LENGTH ? {transform:'translate(.5 .5)'} : {});
  		for(var i = 0; i < this.items.length; i++) {
  			var item = this.items[i];
  			if(item.needsSpace) {
  				Path(x,y).h(10).addTo(g);
  				x += 10;
  			}
  			item.format(x, y, item.width).addTo(g);
  			x += item.width;
  			y += item.height;
  			if(item.needsSpace) {
  				Path(x,y).h(10).addTo(g);
  				x += 10;
  			}
  		}
  		this.attrs.width = this.width + paddingl + paddingr;
  		this.attrs.height = this.up + this.height + this.down + paddingt + paddingb;
  		this.attrs.viewBox = "0 0 " + this.attrs.width + " " + this.attrs.height;
  		g.addTo(this);
  		this.formatted = true;
  		return this;
  	};
  	Diagram.prototype.addTo = function(parent) {
  		if(!parent) {
  			var scriptTag = document.getElementsByTagName('script');
  			scriptTag = scriptTag[scriptTag.length - 1];
  			parent = scriptTag.parentNode;
  		}
  		return this.$super.addTo.call(this, parent);
  	};
  	Diagram.prototype.toSVG = function() {
  		if (!this.formatted) {
  			this.format();
  		}
  		return this.$super.toSVG.call(this);
  	};
  	Diagram.prototype.toString = function() {
  		if (!this.formatted) {
  			this.format();
  		}
  		return this.$super.toString.call(this);
  	};
  	Diagram.DEBUG = false;

  	var ComplexDiagram = funcs.ComplexDiagram = function ComplexDiagram() {
  		var diagram = new Diagram([].slice.call(arguments));
  		var items = diagram.items;
  		items.shift();
  		items.pop();
  		items.unshift(new Start({type:"complex"}));
  		items.push(new End({type:"complex"}));
  		diagram.items = items;
  		return diagram;
  	};

  	var Sequence = funcs.Sequence = function Sequence(items) {
  		if(!(this instanceof Sequence)) return new Sequence([].slice.call(arguments));
  		DiagramMultiContainer.call(this, 'g', items);
  		var numberOfItems = this.items.length;
  		this.needsSpace = true;
  		this.up = this.down = this.height = this.width = 0;
  		for(var i = 0; i < this.items.length; i++) {
  			var item = this.items[i];
  			this.width += item.width + (item.needsSpace?20:0);
  			this.up = Math.max(this.up, item.up - this.height);
  			this.height += item.height;
  			this.down = Math.max(this.down - item.height, item.down);
  		}
  		if(this.items[0].needsSpace) this.width -= 10;
  		if(this.items[this.items.length-1].needsSpace) this.width -= 10;
  		if(Diagram.DEBUG) {
  			this.attrs['data-updown'] = this.up + " " + this.height + " " + this.down;
  			this.attrs['data-type'] = "sequence";
  		}
  	};
  	subclassOf(Sequence, DiagramMultiContainer);
  	Sequence.prototype.format = function(x,y,width) {
  		// Hook up the two sides if this is narrower than its stated width.
  		var gaps = determineGaps(width, this.width);
  		Path(x,y).h(gaps[0]).addTo(this);
  		Path(x+gaps[0]+this.width,y+this.height).h(gaps[1]).addTo(this);
  		x += gaps[0];

  		for(var i = 0; i < this.items.length; i++) {
  			var item = this.items[i];
  			if(item.needsSpace && i > 0) {
  				Path(x,y).h(10).addTo(this);
  				x += 10;
  			}
  			item.format(x, y, item.width).addTo(this);
  			x += item.width;
  			y += item.height;
  			if(item.needsSpace && i < this.items.length-1) {
  				Path(x,y).h(10).addTo(this);
  				x += 10;
  			}
  		}
  		return this;
  	};

  	var Stack = funcs.Stack = function Stack(items) {
  		if(!(this instanceof Stack)) return new Stack([].slice.call(arguments));
  		DiagramMultiContainer.call(this, 'g', items);
  		if( items.length === 0 ) {
  			throw new RangeError("Stack() must have at least one child.");
  		}
  		this.width = Math.max.apply(null, this.items.map(function(e) { return e.width + (e.needsSpace?20:0); }));
  		//if(this.items[0].needsSpace) this.width -= 10;
  		//if(this.items[this.items.length-1].needsSpace) this.width -= 10;
  		if(this.items.length > 1){
  			this.width += Diagram.ARC_RADIUS*2;
  		}
  		this.needsSpace = true;
  		this.up = this.items[0].up;
  		this.down = this.items[this.items.length-1].down;

  		this.height = 0;
  		var last = this.items.length - 1;
  		for(var i = 0; i < this.items.length; i++) {
  			var item = this.items[i];
  			this.height += item.height;
  			if(i > 0) {
  				this.height += Math.max(Diagram.ARC_RADIUS*2, item.up + Diagram.VERTICAL_SEPARATION);
  			}
  			if(i < last) {
  				this.height += Math.max(Diagram.ARC_RADIUS*2, item.down + Diagram.VERTICAL_SEPARATION);
  			}
  		}
  		if(Diagram.DEBUG) {
  			this.attrs['data-updown'] = this.up + " " + this.height + " " + this.down;
  			this.attrs['data-type'] = "stack";
  		}
  	};
  	subclassOf(Stack, DiagramMultiContainer);
  	Stack.prototype.format = function(x,y,width) {
  		var gaps = determineGaps(width, this.width);
  		Path(x,y).h(gaps[0]).addTo(this);
  		x += gaps[0];
  		var xInitial = x;
  		if(this.items.length > 1) {
  			Path(x, y).h(Diagram.ARC_RADIUS).addTo(this);
  			x += Diagram.ARC_RADIUS;
  		}

  		for(var i = 0; i < this.items.length; i++) {
  			var item = this.items[i];
  			var innerWidth = this.width - (this.items.length>1 ? Diagram.ARC_RADIUS*2 : 0);
  			item.format(x, y, innerWidth).addTo(this);
  			x += innerWidth;
  			y += item.height;

  			if(i !== this.items.length-1) {
  				Path(x, y)
  					.arc('ne').down(Math.max(0, item.down + Diagram.VERTICAL_SEPARATION - Diagram.ARC_RADIUS*2))
  					.arc('es').left(innerWidth)
  					.arc('nw').down(Math.max(0, this.items[i+1].up + Diagram.VERTICAL_SEPARATION - Diagram.ARC_RADIUS*2))
  					.arc('ws').addTo(this);
  				y += Math.max(item.down + Diagram.VERTICAL_SEPARATION, Diagram.ARC_RADIUS*2) + Math.max(this.items[i+1].up + Diagram.VERTICAL_SEPARATION, Diagram.ARC_RADIUS*2);
  				//y += Math.max(Diagram.ARC_RADIUS*4, item.down + Diagram.VERTICAL_SEPARATION*2 + this.items[i+1].up)
  				x = xInitial+Diagram.ARC_RADIUS;
  			}

  		}

  		if(this.items.length > 1) {
  			Path(x,y).h(Diagram.ARC_RADIUS).addTo(this);
  			x += Diagram.ARC_RADIUS;
  		}
  		Path(x,y).h(gaps[1]).addTo(this);

  		return this;
  	};

  	var OptionalSequence = funcs.OptionalSequence = function OptionalSequence(items) {
  		if(!(this instanceof OptionalSequence)) return new OptionalSequence([].slice.call(arguments));
  		DiagramMultiContainer.call(this, 'g', items);
  		if( items.length === 0 ) {
  			throw new RangeError("OptionalSequence() must have at least one child.");
  		}
  		if( items.length === 1 ) {
  			return new Sequence(items);
  		}
  		var arc = Diagram.ARC_RADIUS;
  		this.needsSpace = false;
  		this.width = 0;
  		this.up = 0;
  		this.height = sum(this.items, function(x){return x.height});
  		this.down = this.items[0].down;
  		var heightSoFar = 0;
  		for(var i = 0; i < this.items.length; i++) {
  			var item = this.items[i];
  			this.up = Math.max(this.up, Math.max(arc*2, item.up + Diagram.VERTICAL_SEPARATION) - heightSoFar);
  			heightSoFar += item.height;
  			if(i > 0) {
  				this.down = Math.max(this.height + this.down, heightSoFar + Math.max(arc*2, item.down + Diagram.VERTICAL_SEPARATION)) - this.height;
  			}
  			var itemWidth = (item.needsSpace?10:0) + item.width;
  			if(i == 0) {
  				this.width += arc + Math.max(itemWidth, arc);
  			} else {
  				this.width += arc*2 + Math.max(itemWidth, arc) + arc;
  			}
  		}
  		if(Diagram.DEBUG) {
  			this.attrs['data-updown'] = this.up + " " + this.height + " " + this.down;
  			this.attrs['data-type'] = "optseq";
  		}
  	};
  	subclassOf(OptionalSequence, DiagramMultiContainer);
  	OptionalSequence.prototype.format = function(x, y, width) {
  		var arc = Diagram.ARC_RADIUS;
  		var gaps = determineGaps(width, this.width);
  		Path(x, y).right(gaps[0]).addTo(this);
  		Path(x + gaps[0] + this.width, y + this.height).right(gaps[1]).addTo(this);
  		x += gaps[0];
  		var upperLineY = y - this.up;
  		var last = this.items.length - 1;
  		for(var i = 0; i < this.items.length; i++) {
  			var item = this.items[i];
  			var itemSpace = (item.needsSpace?10:0);
  			var itemWidth = item.width + itemSpace;
  			if(i == 0) {
  				// Upper skip
  				Path(x,y)
  					.arc('se')
  					.up(y - upperLineY - arc*2)
  					.arc('wn')
  					.right(itemWidth - arc)
  					.arc('ne')
  					.down(y + item.height - upperLineY - arc*2)
  					.arc('ws')
  					.addTo(this);
  				// Straight line
  				Path(x, y)
  					.right(itemSpace + arc)
  					.addTo(this);
  				item.format(x + itemSpace + arc, y, item.width).addTo(this);
  				x += itemWidth + arc;
  				y += item.height;
  				// x ends on the far side of the first element,
  				// where the next element's skip needs to begin
  			} else if(i < last) {
  				// Upper skip
  				Path(x, upperLineY)
  					.right(arc*2 + Math.max(itemWidth, arc) + arc)
  					.arc('ne')
  					.down(y - upperLineY + item.height - arc*2)
  					.arc('ws')
  					.addTo(this);
  				// Straight line
  				Path(x,y)
  					.right(arc*2)
  					.addTo(this);
  				item.format(x + arc*2, y, item.width).addTo(this);
  				Path(x + item.width + arc*2, y + item.height)
  					.right(itemSpace + arc)
  					.addTo(this);
  				// Lower skip
  				Path(x,y)
  					.arc('ne')
  					.down(item.height + Math.max(item.down + Diagram.VERTICAL_SEPARATION, arc*2) - arc*2)
  					.arc('ws')
  					.right(itemWidth - arc)
  					.arc('se')
  					.up(item.down + Diagram.VERTICAL_SEPARATION - arc*2)
  					.arc('wn')
  					.addTo(this);
  				x += arc*2 + Math.max(itemWidth, arc) + arc;
  				y += item.height;
  			} else {
  				// Straight line
  				Path(x, y)
  					.right(arc*2)
  					.addTo(this);
  				item.format(x + arc*2, y, item.width).addTo(this);
  				Path(x + arc*2 + item.width, y + item.height)
  					.right(itemSpace + arc)
  					.addTo(this);
  				// Lower skip
  				Path(x,y)
  					.arc('ne')
  					.down(item.height + Math.max(item.down + Diagram.VERTICAL_SEPARATION, arc*2) - arc*2)
  					.arc('ws')
  					.right(itemWidth - arc)
  					.arc('se')
  					.up(item.down + Diagram.VERTICAL_SEPARATION - arc*2)
  					.arc('wn')
  					.addTo(this);
  			}
  		}
  		return this;
  	};

  	var AlternatingSequence = funcs.AlternatingSequence = function AlternatingSequence(items) {
  		if(!(this instanceof AlternatingSequence)) return new AlternatingSequence([].slice.call(arguments));
  		DiagramMultiContainer.call(this, 'g', items);
  		if( items.length === 1 ) {
  			return new Sequence(items);
  		}
  		if( items.length !== 2 ) {
  			throw new RangeError("AlternatingSequence() must have one or two children.");
  		}
  		this.needsSpace = false;

  		const arc = Diagram.ARC_RADIUS;
  		const vert = Diagram.VERTICAL_SEPARATION;
  		const max = Math.max;
  		const first = this.items[0];
  		const second = this.items[1];

  		const arcX = 1 / Math.sqrt(2) * arc * 2;
  		const arcY = (1 - 1 / Math.sqrt(2)) * arc * 2;
  		const crossY = Math.max(arc, Diagram.VERTICAL_SEPARATION);
  		const crossX = (crossY - arcY) + arcX;

  		const firstOut = max(arc + arc, crossY/2 + arc + arc, crossY/2 + vert + first.down);
  		this.up = firstOut + first.height + first.up;

  		const secondIn = max(arc + arc, crossY/2 + arc + arc, crossY/2 + vert + second.up);
  		this.down = secondIn + second.height + second.down;

  		this.height = 0;

  		const firstWidth = 2*(first.needsSpace?10:0) + first.width;
  		const secondWidth = 2*(second.needsSpace?10:0) + second.width;
  		this.width = 2*arc + max(firstWidth, crossX, secondWidth) + 2*arc;

  		if(Diagram.DEBUG) {
  			this.attrs['data-updown'] = this.up + " " + this.height + " " + this.down;
  			this.attrs['data-type'] = "altseq";
  		}
  	};
  	subclassOf(AlternatingSequence, DiagramMultiContainer);
  	AlternatingSequence.prototype.format = function(x, y, width) {
  		const arc = Diagram.ARC_RADIUS;
  		const gaps = determineGaps(width, this.width);
  		Path(x,y).right(gaps[0]).addTo(this);
  		console.log(gaps);
  		x += gaps[0];
  		Path(x+this.width, y).right(gaps[1]).addTo(this);
  		// bounding box
  		//Path(x+gaps[0], y).up(this.up).right(this.width).down(this.up+this.down).left(this.width).up(this.down).addTo(this);
  		const first = this.items[0];
  		const second = this.items[1];

  		// top
  		const firstIn = this.up - first.up;
  		const firstOut = this.up - first.up - first.height;
  		Path(x,y).arc('se').up(firstIn-2*arc).arc('wn').addTo(this);
  		first.format(x + 2*arc, y - firstIn, this.width - 4*arc).addTo(this);
  		Path(x + this.width - 2*arc, y - firstOut).arc('ne').down(firstOut - 2*arc).arc('ws').addTo(this);

  		// bottom
  		const secondIn = this.down - second.down - second.height;
  		const secondOut = this.down - second.down;
  		Path(x,y).arc('ne').down(secondIn - 2*arc).arc('ws').addTo(this);
  		second.format(x + 2*arc, y + secondIn, this.width - 4*arc).addTo(this);
  		Path(x + this.width - 2*arc, y + secondOut).arc('se').up(secondOut - 2*arc).arc('wn').addTo(this);

  		// crossover
  		const arcX = 1 / Math.sqrt(2) * arc * 2;
  		const arcY = (1 - 1 / Math.sqrt(2)) * arc * 2;
  		const crossY = Math.max(arc, Diagram.VERTICAL_SEPARATION);
  		const crossX = (crossY - arcY) + arcX;
  		const crossBar = (this.width - 4*arc - crossX)/2;
  		Path(x+arc, y - crossY/2 - arc).arc('ws').right(crossBar)
  			.arc_8('n', 'cw').l(crossX - arcX, crossY - arcY).arc_8('sw', 'ccw')
  			.right(crossBar).arc('ne').addTo(this);
  		Path(x+arc, y + crossY/2 + arc).arc('wn').right(crossBar)
  			.arc_8('s', 'ccw').l(crossX - arcX, -(crossY - arcY)).arc_8('nw', 'cw')
  			.right(crossBar).arc('se').addTo(this);

  		return this;
  	};

  	var Choice = funcs.Choice = function Choice(normal, items) {
  		if(!(this instanceof Choice)) return new Choice(normal, [].slice.call(arguments,1));
  		DiagramMultiContainer.call(this, 'g', items);
  		if( typeof normal !== "number" || normal !== Math.floor(normal) ) {
  			throw new TypeError("The first argument of Choice() must be an integer.");
  		} else if(normal < 0 || normal >= items.length) {
  			throw new RangeError("The first argument of Choice() must be an index for one of the items.");
  		} else {
  			this.normal = normal;
  		}
  		var first = 0;
  		var last = items.length - 1;
  		this.width = Math.max.apply(null, this.items.map(function(el){return el.width})) + Diagram.ARC_RADIUS*4;
  		this.height = this.items[normal].height;
  		this.up = this.items[first].up;
  		for(var i = first; i < normal; i++) {
  			if(i == normal-1) var arcs = Diagram.ARC_RADIUS*2;
  			else var arcs = Diagram.ARC_RADIUS;
  			this.up += Math.max(arcs, this.items[i].height + this.items[i].down + Diagram.VERTICAL_SEPARATION + this.items[i+1].up);
  		}
  		this.down = this.items[last].down;
  		for(var i = normal+1; i <= last; i++) {
  			if(i == normal+1) var arcs = Diagram.ARC_RADIUS*2;
  			else var arcs = Diagram.ARC_RADIUS;
  			this.down += Math.max(arcs, this.items[i-1].height + this.items[i-1].down + Diagram.VERTICAL_SEPARATION + this.items[i].up);
  		}
  		this.down -= this.items[normal].height; // already counted in Choice.height
  		if(Diagram.DEBUG) {
  			this.attrs['data-updown'] = this.up + " " + this.height + " " + this.down;
  			this.attrs['data-type'] = "choice";
  		}
  	};
  	subclassOf(Choice, DiagramMultiContainer);
  	Choice.prototype.format = function(x,y,width) {
  		// Hook up the two sides if this is narrower than its stated width.
  		var gaps = determineGaps(width, this.width);
  		Path(x,y).h(gaps[0]).addTo(this);
  		Path(x+gaps[0]+this.width,y+this.height).h(gaps[1]).addTo(this);
  		x += gaps[0];

  		var last = this.items.length -1;
  		var innerWidth = this.width - Diagram.ARC_RADIUS*4;

  		// Do the elements that curve above
  		for(var i = this.normal - 1; i >= 0; i--) {
  			var item = this.items[i];
  			if( i == this.normal - 1 ) {
  				var distanceFromY = Math.max(Diagram.ARC_RADIUS*2, this.items[this.normal].up + Diagram.VERTICAL_SEPARATION + item.down + item.height);
  			}
  			Path(x,y)
  				.arc('se')
  				.up(distanceFromY - Diagram.ARC_RADIUS*2)
  				.arc('wn').addTo(this);
  			item.format(x+Diagram.ARC_RADIUS*2,y - distanceFromY,innerWidth).addTo(this);
  			Path(x+Diagram.ARC_RADIUS*2+innerWidth, y-distanceFromY+item.height)
  				.arc('ne')
  				.down(distanceFromY - item.height + this.height - Diagram.ARC_RADIUS*2)
  				.arc('ws').addTo(this);
  			distanceFromY += Math.max(Diagram.ARC_RADIUS, item.up + Diagram.VERTICAL_SEPARATION + (i == 0 ? 0 : this.items[i-1].down+this.items[i-1].height));
  		}

  		// Do the straight-line path.
  		Path(x,y).right(Diagram.ARC_RADIUS*2).addTo(this);
  		this.items[this.normal].format(x+Diagram.ARC_RADIUS*2, y, innerWidth).addTo(this);
  		Path(x+Diagram.ARC_RADIUS*2+innerWidth, y+this.height).right(Diagram.ARC_RADIUS*2).addTo(this);

  		// Do the elements that curve below
  		for(var i = this.normal+1; i <= last; i++) {
  			var item = this.items[i];
  			if( i == this.normal + 1 ) {
  				var distanceFromY = Math.max(Diagram.ARC_RADIUS*2, this.height + this.items[this.normal].down + Diagram.VERTICAL_SEPARATION + item.up);
  			}
  			Path(x,y)
  				.arc('ne')
  				.down(distanceFromY - Diagram.ARC_RADIUS*2)
  				.arc('ws').addTo(this);
  			item.format(x+Diagram.ARC_RADIUS*2, y+distanceFromY, innerWidth).addTo(this);
  			Path(x+Diagram.ARC_RADIUS*2+innerWidth, y+distanceFromY+item.height)
  				.arc('se')
  				.up(distanceFromY - Diagram.ARC_RADIUS*2 + item.height - this.height)
  				.arc('wn').addTo(this);
  			distanceFromY += Math.max(Diagram.ARC_RADIUS, item.height + item.down + Diagram.VERTICAL_SEPARATION + (i == last ? 0 : this.items[i+1].up));
  		}

  		return this;
  	};


  	var HorizontalChoice = funcs.HorizontalChoice = function HorizontalChoice(items) {
  		if(!(this instanceof HorizontalChoice)) return new HorizontalChoice([].slice.call(arguments));
  		if( items.length === 0 ) {
  			throw new RangeError("HorizontalChoice() must have at least one child.");
  		}
  		if( items.length === 1) {
  			return new Sequence(items);
  		}
  		DiagramMultiContainer.call(this, 'g', items);

  		const allButLast = this.items.slice(0, -1);
  		const middles = this.items.slice(1, -1);
  		const first = this.items[0];
  		const last = this.items[this.items.length - 1];
  		this.needsSpace = false;

  		this.width = Diagram.ARC_RADIUS; // starting track
  		this.width += Diagram.ARC_RADIUS*2 * (this.items.length-1); // inbetween tracks
  		this.width += sum(this.items, x=>x.width + (x.needsSpace?20:0)); // items
  		this.width += (last.height > 0 ? Diagram.ARC_RADIUS : 0); // needs space to curve up
  		this.width += Diagram.ARC_RADIUS; //ending track

  		// Always exits at entrance height
  		this.height = 0;

  		// All but the last have a track running above them
  		this._upperTrack = Math.max(
  			Diagram.ARC_RADIUS*2,
  			Diagram.VERTICAL_SEPARATION,
  			max(allButLast, x=>x.up) + Diagram.VERTICAL_SEPARATION
  		);
  		this.up = Math.max(this._upperTrack, last.up);

  		// All but the first have a track running below them
  		// Last either straight-lines or curves up, so has different calculation
  		this._lowerTrack = Math.max(
  			Diagram.VERTICAL_SEPARATION,
  			max(middles, x=>x.height+Math.max(x.down+Diagram.VERTICAL_SEPARATION, Diagram.ARC_RADIUS*2)),
  			last.height + last.down + Diagram.VERTICAL_SEPARATION
  		);
  		if(first.height < this._lowerTrack) {
  			// Make sure there's at least 2*AR room between first exit and lower track
  			this._lowerTrack = Math.max(this._lowerTrack, first.height + Diagram.ARC_RADIUS*2);
  		}
  		this.down = Math.max(this._lowerTrack, first.height + first.down);

  		if(Diagram.DEBUG) {
  			this.attrs['data-updown'] = this.up + " " + this.height + " " + this.down;
  			this.attrs['data-type'] = "horizontalchoice";
  		}
  	};
  	subclassOf(HorizontalChoice, DiagramMultiContainer);
  	HorizontalChoice.prototype.format = function(x,y,width) {
  		// Hook up the two sides if this is narrower than its stated width.
  		var gaps = determineGaps(width, this.width);
  		new Path(x,y).h(gaps[0]).addTo(this);
  		new Path(x+gaps[0]+this.width,y+this.height).h(gaps[1]).addTo(this);
  		x += gaps[0];

  		const first = this.items[0];
  		const last = this.items[this.items.length-1];
  		const allButFirst = this.items.slice(1);
  		const allButLast = this.items.slice(0, -1);

  		// upper track
  		var upperSpan = (sum(allButLast, x=>x.width+(x.needsSpace?20:0))
  			+ (this.items.length - 2) * Diagram.ARC_RADIUS*2
  			- Diagram.ARC_RADIUS
  		);
  		new Path(x,y)
  			.arc('se')
  			.v(-(this._upperTrack - Diagram.ARC_RADIUS*2))
  			.arc('wn')
  			.h(upperSpan)
  			.addTo(this);

  		// lower track
  		var lowerSpan = (sum(allButFirst, x=>x.width+(x.needsSpace?20:0))
  			+ (this.items.length - 2) * Diagram.ARC_RADIUS*2
  			+ (last.height > 0 ? Diagram.ARC_RADIUS : 0)
  			- Diagram.ARC_RADIUS
  		);
  		var lowerStart = x + Diagram.ARC_RADIUS + first.width+(first.needsSpace?20:0) + Diagram.ARC_RADIUS*2;
  		new Path(lowerStart, y+this._lowerTrack)
  			.h(lowerSpan)
  			.arc('se')
  			.v(-(this._lowerTrack - Diagram.ARC_RADIUS*2))
  			.arc('wn')
  			.addTo(this);

  		// Items
  		for(const [i, item] of enumerate(this.items)) {
  			// input track
  			if(i === 0) {
  				new Path(x,y)
  					.h(Diagram.ARC_RADIUS)
  					.addTo(this);
  				x += Diagram.ARC_RADIUS;
  			} else {
  				new Path(x, y - this._upperTrack)
  					.arc('ne')
  					.v(this._upperTrack - Diagram.ARC_RADIUS*2)
  					.arc('ws')
  					.addTo(this);
  				x += Diagram.ARC_RADIUS*2;
  			}

  			// item
  			var itemWidth = item.width + (item.needsSpace?20:0);
  			item.format(x, y, itemWidth).addTo(this);
  			x += itemWidth;

  			// output track
  			if(i === this.items.length-1) {
  				if(item.height === 0) {
  					new Path(x,y)
  						.h(Diagram.ARC_RADIUS)
  						.addTo(this);
  				} else {
  					new Path(x,y+item.height)
  					.arc('se')
  					.addTo(this);
  				}
  			} else if(i === 0 && item.height > this._lowerTrack) {
  				// Needs to arc up to meet the lower track, not down.
  				if(item.height - this._lowerTrack >= Diagram.ARC_RADIUS*2) {
  					new Path(x, y+item.height)
  						.arc('se')
  						.v(this._lowerTrack - item.height + Diagram.ARC_RADIUS*2)
  						.arc('wn')
  						.addTo(this);
  				} else {
  					// Not enough space to fit two arcs
  					// so just bail and draw a straight line for now.
  					new Path(x, y+item.height)
  						.l(Diagram.ARC_RADIUS*2, this._lowerTrack - item.height)
  						.addTo(this);
  				}
  			} else {
  				new Path(x, y+item.height)
  					.arc('ne')
  					.v(this._lowerTrack - item.height - Diagram.ARC_RADIUS*2)
  					.arc('ws')
  					.addTo(this);
  			}
  		}
  		return this;
  	};


  	var MultipleChoice = funcs.MultipleChoice = function MultipleChoice(normal, type, items) {
  		if(!(this instanceof MultipleChoice)) return new MultipleChoice(normal, type, [].slice.call(arguments,2));
  		DiagramMultiContainer.call(this, 'g', items);
  		if( typeof normal !== "number" || normal !== Math.floor(normal) ) {
  			throw new TypeError("The first argument of MultipleChoice() must be an integer.");
  		} else if(normal < 0 || normal >= items.length) {
  			throw new RangeError("The first argument of MultipleChoice() must be an index for one of the items.");
  		} else {
  			this.normal = normal;
  		}
  		if( type != "any" && type != "all" ) {
  			throw new SyntaxError("The second argument of MultipleChoice must be 'any' or 'all'.");
  		} else {
  			this.type = type;
  		}
  		this.needsSpace = true;
  		this.innerWidth = max(this.items, function(x){return x.width});
  		this.width = 30 + Diagram.ARC_RADIUS + this.innerWidth + Diagram.ARC_RADIUS + 20;
  		this.up = this.items[0].up;
  		this.down = this.items[this.items.length-1].down;
  		this.height = this.items[normal].height;
  		for(var i = 0; i < this.items.length; i++) {
  			var item = this.items[i];
  			if(i == normal - 1 || i == normal + 1) var minimum = 10 + Diagram.ARC_RADIUS;
  			else var minimum = Diagram.ARC_RADIUS;
  			if(i < normal) {
  				this.up += Math.max(minimum, item.height + item.down + Diagram.VERTICAL_SEPARATION + this.items[i+1].up);
  			} else if(i > normal) {
  				this.down += Math.max(minimum, item.up + Diagram.VERTICAL_SEPARATION + this.items[i-1].down + this.items[i-1].height);
  			}
  		}
  		this.down -= this.items[normal].height; // already counted in this.height
  		if(Diagram.DEBUG) {
  			this.attrs['data-updown'] = this.up + " " + this.height + " " + this.down;
  			this.attrs['data-type'] = "multiplechoice";
  		}
  	};
  	subclassOf(MultipleChoice, DiagramMultiContainer);
  	MultipleChoice.prototype.format = function(x, y, width) {
  		var gaps = determineGaps(width, this.width);
  		Path(x, y).right(gaps[0]).addTo(this);
  		Path(x + gaps[0] + this.width, y + this.height).right(gaps[1]).addTo(this);
  		x += gaps[0];

  		var normal = this.items[this.normal];

  		// Do the elements that curve above
  		for(var i = this.normal - 1; i >= 0; i--) {
  			var item = this.items[i];
  			if( i == this.normal - 1 ) {
  				var distanceFromY = Math.max(10 + Diagram.ARC_RADIUS, normal.up + Diagram.VERTICAL_SEPARATION + item.down + item.height);
  			}
  			Path(x + 30,y)
  				.up(distanceFromY - Diagram.ARC_RADIUS)
  				.arc('wn').addTo(this);
  			item.format(x + 30 + Diagram.ARC_RADIUS, y - distanceFromY, this.innerWidth).addTo(this);
  			Path(x + 30 + Diagram.ARC_RADIUS + this.innerWidth, y - distanceFromY + item.height)
  				.arc('ne')
  				.down(distanceFromY - item.height + this.height - Diagram.ARC_RADIUS - 10)
  				.addTo(this);
  			if(i != 0) {
  				distanceFromY += Math.max(Diagram.ARC_RADIUS, item.up + Diagram.VERTICAL_SEPARATION + this.items[i-1].down + this.items[i-1].height);
  			}
  		}

  		Path(x + 30, y).right(Diagram.ARC_RADIUS).addTo(this);
  		normal.format(x + 30 + Diagram.ARC_RADIUS, y, this.innerWidth).addTo(this);
  		Path(x + 30 + Diagram.ARC_RADIUS + this.innerWidth, y + this.height).right(Diagram.ARC_RADIUS).addTo(this);

  		for(var i = this.normal+1; i < this.items.length; i++) {
  			var item = this.items[i];
  			if(i == this.normal + 1) {
  				var distanceFromY = Math.max(10+Diagram.ARC_RADIUS, normal.height + normal.down + Diagram.VERTICAL_SEPARATION + item.up);
  			}
  			Path(x + 30, y)
  				.down(distanceFromY - Diagram.ARC_RADIUS)
  				.arc('ws')
  				.addTo(this);
  			item.format(x + 30 + Diagram.ARC_RADIUS, y + distanceFromY, this.innerWidth).addTo(this);
  			Path(x + 30 + Diagram.ARC_RADIUS + this.innerWidth, y + distanceFromY + item.height)
  				.arc('se')
  				.up(distanceFromY - Diagram.ARC_RADIUS + item.height - normal.height)
  				.addTo(this);
  			if(i != this.items.length - 1) {
  				distanceFromY += Math.max(Diagram.ARC_RADIUS, item.height + item.down + Diagram.VERTICAL_SEPARATION + this.items[i+1].up);
  			}
  		}
  		var text = FakeSVG('g', {"class": "diagram-text"}).addTo(this);
  		FakeSVG('title', {}, (this.type=="any"?"take one or more branches, once each, in any order":"take all branches, once each, in any order")).addTo(text);
  		FakeSVG('path', {
  			"d": "M "+(x+30)+" "+(y-10)+" h -26 a 4 4 0 0 0 -4 4 v 12 a 4 4 0 0 0 4 4 h 26 z",
  			"class": "diagram-text"
  			}).addTo(text);
  		FakeSVG('text', {
  			"x": x + 15,
  			"y": y + 4,
  			"class": "diagram-text"
  			}, (this.type=="any"?"1+":"all")).addTo(text);
  		FakeSVG('path', {
  			"d": "M "+(x+this.width-20)+" "+(y-10)+" h 16 a 4 4 0 0 1 4 4 v 12 a 4 4 0 0 1 -4 4 h -16 z",
  			"class": "diagram-text"
  			}).addTo(text);
  		FakeSVG('path', {
  			"d": "M "+(x+this.width-13)+" "+(y-2)+" a 4 4 0 1 0 6 -1 m 2.75 -1 h -4 v 4 m 0 -3 h 2",
  			"style": "stroke-width: 1.75"
  		}).addTo(text);
  		return this;
  	};

  	var Optional = funcs.Optional = function Optional(item, skip) {
  		if( skip === undefined )
  			return Choice(1, Skip(), item);
  		else if ( skip === "skip" )
  			return Choice(0, Skip(), item);
  		else
  			throw "Unknown value for Optional()'s 'skip' argument.";
  	};

  	var OneOrMore = funcs.OneOrMore = function OneOrMore(item, rep) {
  		if(!(this instanceof OneOrMore)) return new OneOrMore(item, rep);
  		FakeSVG.call(this, 'g');
  		rep = rep || (new Skip);
  		this.item = wrapString(item);
  		this.rep = wrapString(rep);
  		this.width = Math.max(this.item.width, this.rep.width) + Diagram.ARC_RADIUS*2;
  		this.height = this.item.height;
  		this.up = this.item.up;
  		this.down = Math.max(Diagram.ARC_RADIUS*2, this.item.down + Diagram.VERTICAL_SEPARATION + this.rep.up + this.rep.height + this.rep.down);
  		if(Diagram.DEBUG) {
  			this.attrs['data-updown'] = this.up + " " + this.height + " " + this.down;
  			this.attrs['data-type'] = "oneormore";
  		}
  	};
  	subclassOf(OneOrMore, FakeSVG);
  	OneOrMore.prototype.needsSpace = true;
  	OneOrMore.prototype.format = function(x,y,width) {
  		// Hook up the two sides if this is narrower than its stated width.
  		var gaps = determineGaps(width, this.width);
  		Path(x,y).h(gaps[0]).addTo(this);
  		Path(x+gaps[0]+this.width,y+this.height).h(gaps[1]).addTo(this);
  		x += gaps[0];

  		// Draw item
  		Path(x,y).right(Diagram.ARC_RADIUS).addTo(this);
  		this.item.format(x+Diagram.ARC_RADIUS,y,this.width-Diagram.ARC_RADIUS*2).addTo(this);
  		Path(x+this.width-Diagram.ARC_RADIUS,y+this.height).right(Diagram.ARC_RADIUS).addTo(this);

  		// Draw repeat arc
  		var distanceFromY = Math.max(Diagram.ARC_RADIUS*2, this.item.height+this.item.down+Diagram.VERTICAL_SEPARATION+this.rep.up);
  		Path(x+Diagram.ARC_RADIUS,y).arc('nw').down(distanceFromY-Diagram.ARC_RADIUS*2).arc('ws').addTo(this);
  		this.rep.format(x+Diagram.ARC_RADIUS, y+distanceFromY, this.width - Diagram.ARC_RADIUS*2).addTo(this);
  		Path(x+this.width-Diagram.ARC_RADIUS, y+distanceFromY+this.rep.height).arc('se').up(distanceFromY-Diagram.ARC_RADIUS*2+this.rep.height-this.item.height).arc('en').addTo(this);

  		return this;
  	};
  	OneOrMore.prototype.walk = function(cb) {
  		cb(this);
  		this.item.walk(cb);
  		this.rep.walk(cb);
  	};

  	var ZeroOrMore = funcs.ZeroOrMore = function ZeroOrMore(item, rep, skip) {
  		return Optional(OneOrMore(item, rep), skip);
  	};

  	var Start = funcs.Start = function Start({type="simple", label}={}) {
  		if(!(this instanceof Start)) return new Start({type, label});
  		FakeSVG.call(this, 'g');
  		this.width = 20;
  		this.height = 0;
  		this.up = 10;
  		this.down = 10;
  		this.type = type;
  		if(label != undefined) {
  			this.label = ""+label;
  			this.width = Math.max(20, this.label.length * Diagram.CHAR_WIDTH + 10);
  		}
  		if(Diagram.DEBUG) {
  			this.attrs['data-updown'] = this.up + " " + this.height + " " + this.down;
  			this.attrs['data-type'] = "start";
  		}
  	};
  	subclassOf(Start, FakeSVG);
  	Start.prototype.format = function(x,y) {
  		let path = new Path(x, y-10);
  		if (this.type === "complex") {
  			path.down(20)
  				.m(0, -10)
  				.right(this.width)
  				.addTo(this);
  		} else {
  			path.down(20)
  				.m(10, -20)
  				.down(20)
  				.m(-10, -10)
  				.right(this.width)
  				.addTo(this);
  		}
  		if(this.label) {
  			new FakeSVG('text', {x:x, y:y-15, style:"text-anchor:start"}, this.label).addTo(this);
  		}
  		return this;
  	};

  	var End = funcs.End = function End({type="simple"}={}) {
  		if(!(this instanceof End)) return new End({type});
  		FakeSVG.call(this, 'path');
  		this.width = 20;
  		this.height = 0;
  		this.up = 10;
  		this.down = 10;
  		this.type = type;
  		if(Diagram.DEBUG) {
  			this.attrs['data-updown'] = this.up + " " + this.height + " " + this.down;
  			this.attrs['data-type'] = "end";
  		}
  	};
  	subclassOf(End, FakeSVG);
  	End.prototype.format = function(x,y) {
  		if (this.type === "complex") {
  			this.attrs.d = 'M '+x+' '+y+' h 20 m 0 -10 v 20';
  		} else {
  			this.attrs.d = 'M '+x+' '+y+' h 20 m -10 -10 v 20 m 10 -20 v 20';
  		}
  		return this;
  	};

  	var Terminal = funcs.Terminal = function Terminal(text, {href, title}={}) {
  		if(!(this instanceof Terminal)) return new Terminal(text, {href, title});
  		FakeSVG.call(this, 'g', {'class': 'terminal'});
  		this.text = ""+text;
  		this.href = href;
  		this.title = title;
  		this.width = this.text.length * Diagram.CHAR_WIDTH + 20;
  		this.height = 0;
  		this.up = 11;
  		this.down = 11;
  		if(Diagram.DEBUG) {
  			this.attrs['data-updown'] = this.up + " " + this.height + " " + this.down;
  			this.attrs['data-type'] = "terminal";
  		}
  	};
  	subclassOf(Terminal, FakeSVG);
  	Terminal.prototype.needsSpace = true;
  	Terminal.prototype.format = function(x, y, width) {
  		// Hook up the two sides if this is narrower than its stated width.
  		var gaps = determineGaps(width, this.width);
  		Path(x,y).h(gaps[0]).addTo(this);
  		Path(x+gaps[0]+this.width,y).h(gaps[1]).addTo(this);
  		x += gaps[0];

  		FakeSVG('rect', {x:x, y:y-11, width:this.width, height:this.up+this.down, rx:10, ry:10}).addTo(this);
  		var text = FakeSVG('text', {x:x+this.width/2, y:y+4}, this.text);
  		if(this.href)
  			FakeSVG('a', {'xlink:href': this.href}, [text]).addTo(this);
  		else
  			text.addTo(this);
  		if(this.title)
  			new FakeSVG('title', {}, this.title).addTo(this);
  		return this;
  	};

  	var NonTerminal = funcs.NonTerminal = function NonTerminal(text, {href, title}={}) {
  		if(!(this instanceof NonTerminal)) return new NonTerminal(text, {href, title});
  		FakeSVG.call(this, 'g', {'class': 'non-terminal'});
  		this.text = ""+text;
  		this.href = href;
  		this.title = title;
  		this.width = this.text.length * Diagram.CHAR_WIDTH + 20;
  		this.height = 0;
  		this.up = 11;
  		this.down = 11;
  		if(Diagram.DEBUG) {
  			this.attrs['data-updown'] = this.up + " " + this.height + " " + this.down;
  			this.attrs['data-type'] = "nonterminal";
  		}
  	};
  	subclassOf(NonTerminal, FakeSVG);
  	NonTerminal.prototype.needsSpace = true;
  	NonTerminal.prototype.format = function(x, y, width) {
  		// Hook up the two sides if this is narrower than its stated width.
  		var gaps = determineGaps(width, this.width);
  		Path(x,y).h(gaps[0]).addTo(this);
  		Path(x+gaps[0]+this.width,y).h(gaps[1]).addTo(this);
  		x += gaps[0];

  		FakeSVG('rect', {x:x, y:y-11, width:this.width, height:this.up+this.down}).addTo(this);
  		var text = FakeSVG('text', {x:x+this.width/2, y:y+4}, this.text);
  		if(this.href)
  			FakeSVG('a', {'xlink:href': this.href}, [text]).addTo(this);
  		else
  			text.addTo(this);
  		if(this.title)
  			new FakeSVG('title', {}, this.title).addTo(this);
  		return this;
  	};

  	var Comment = funcs.Comment = function Comment(text, {href, title}={}) {
  		if(!(this instanceof Comment)) return new Comment(text, {href, title});
  		FakeSVG.call(this, 'g');
  		this.text = ""+text;
  		this.href = href;
  		this.title = title;
  		this.width = this.text.length * Diagram.COMMENT_CHAR_WIDTH + 10;
  		this.height = 0;
  		this.up = 11;
  		this.down = 11;
  		if(Diagram.DEBUG) {
  			this.attrs['data-updown'] = this.up + " " + this.height + " " + this.down;
  			this.attrs['data-type'] = "comment";
  		}
  	};
  	subclassOf(Comment, FakeSVG);
  	Comment.prototype.needsSpace = true;
  	Comment.prototype.format = function(x, y, width) {
  		// Hook up the two sides if this is narrower than its stated width.
  		var gaps = determineGaps(width, this.width);
  		Path(x,y).h(gaps[0]).addTo(this);
  		Path(x+gaps[0]+this.width,y+this.height).h(gaps[1]).addTo(this);
  		x += gaps[0];

  		var text = FakeSVG('text', {x:x+this.width/2, y:y+5, class:'comment'}, this.text);
  		if(this.href)
  			FakeSVG('a', {'xlink:href': this.href}, [text]).addTo(this);
  		else
  			text.addTo(this);
  		if(this.title)
  			new FakeSVG('title', {}, this.title).addTo(this);
  		return this;
  	};

  	var Skip = funcs.Skip = function Skip() {
  		if(!(this instanceof Skip)) return new Skip();
  		FakeSVG.call(this, 'g');
  		this.width = 0;
  		this.height = 0;
  		this.up = 0;
  		this.down = 0;
  		if(Diagram.DEBUG) {
  			this.attrs['data-updown'] = this.up + " " + this.height + " " + this.down;
  			this.attrs['data-type'] = "skip";
  		}
  	};
  	subclassOf(Skip, FakeSVG);
  	Skip.prototype.format = function(x, y, width) {
  		Path(x,y).right(width).addTo(this);
  		return this;
  	};


  	var Block = funcs.Block = function Block({width=50, up=15, height=25, down=15, needsSpace=true}={}) {
  		if(!(this instanceof Block)) return new Block({width, up, height, down, needsSpace});
  		FakeSVG.call(this, 'g');
  		this.width = width;
  		this.height = height;
  		this.up = up;
  		this.down = down;
  		this.needsSpace = true;
  		if(Diagram.DEBUG) {
  			this.attrs['data-updown'] = this.up + " " + this.height + " " + this.down;
  			this.attrs['data-type'] = "block";
  		}
  	};
  	subclassOf(Block, FakeSVG);
  	Block.prototype.format = function(x, y, width) {
  		// Hook up the two sides if this is narrower than its stated width.
  		var gaps = determineGaps(width, this.width);
  		new Path(x,y).h(gaps[0]).addTo(this);
  		new Path(x+gaps[0]+this.width,y).h(gaps[1]).addTo(this);
  		x += gaps[0];

  		new FakeSVG('rect', {x:x, y:y-this.up, width:this.width, height:this.up+this.height+this.down}).addTo(this);
  		return this;
  	};

  	var root;
  	{
  		// CommonJS for node
  		root = exports;
  	}

  	for(var name in funcs) {
  		root[name] = funcs[name];
  	}
  }).call(commonjsGlobal,
  	{
  	VERTICAL_SEPARATION: 8,
  	ARC_RADIUS: 10,
  	DIAGRAM_CLASS: 'railroad-diagram',
  	STROKE_ODD_PIXEL_LENGTH: true,
  	INTERNAL_ALIGNMENT: 'center',
  	CHAR_WIDTH: 8.5, // width of each monospace character. play until you find the right value for your font
  	COMMENT_CHAR_WIDTH: 7, // comments are in smaller text by default
  	}
  );
  });

  const {
    FakeSVG,
    Path,
    Diagram,
    Comment,
    Terminal
  } = railroadDiagrams;

  const subclassOf = (baseClass, superClass) => {
    baseClass.prototype = Object.create(superClass.prototype);
    baseClass.prototype.$super = superClass.prototype;
  };

  const determineGaps = (outer, inner) => {
    const diff = outer - inner;
    switch (Diagram.INTERNAL_ALIGNMENT) {
      case "left":
        return [0, diff];
      case "right":
        return [diff, 0];
      case "center":
      default:
        return [diff / 2, diff / 2];
    }
  };

  const CommentWithLine = function CommentWithLine(text, { href, title } = {}) {
    if (!(this instanceof CommentWithLine))
      return new CommentWithLine(text, { href, title });
    FakeSVG.call(this, "g");
    this.text = "" + text;
    this.href = href;
    this.title = title;
    this.width = this.text.length * Diagram.COMMENT_CHAR_WIDTH + 10;
    this.height = 0;
    this.up = 11 + 2;
    this.down = 11;
    if (Diagram.DEBUG) {
      this.attrs["data-updown"] = this.up + " " + this.height + " " + this.down;
      this.attrs["data-type"] = "comment";
    }
  };
  subclassOf(CommentWithLine, FakeSVG);
  CommentWithLine.prototype.needsSpace = true;
  CommentWithLine.prototype.format = function(x, y, width) {
    // Hook up the two sides if this is narrower than its stated width.
    var gaps = determineGaps(width, this.width);
    Path(x, y)
      .h(gaps[0])
      .addTo(this);
    Path(x, y)
      .right(width)
      .addTo(this);
    Path(x + gaps[0] + this.width, y + this.height)
      .h(gaps[1])
      .addTo(this);
    x += gaps[0];

    var text = FakeSVG(
      "text",
      { x: x + this.width / 2, y: y - 5, class: "comment" },
      this.text
    );
    if (this.href) FakeSVG("a", { "xlink:href": this.href }, [text]).addTo(this);
    else text.addTo(this);
    if (this.title) new FakeSVG("title", {}, this.title).addTo(this);
    return this;
  };

  function wrapString(value) {
    return value instanceof FakeSVG ? value : new Terminal("" + value);
  }

  const Group = function Group(item, label) {
    if (!(this instanceof Group)) return new Group(item, label);
    FakeSVG.call(this, "g");
    this.item = wrapString(item);
    this.label =
      label instanceof FakeSVG ? label : label ? new Comment(label) : undefined;

    this.width = Math.max(
      this.item.width + (this.item.needsSpace ? 20 : 0),
      this.label ? this.label.width : 0,
      Diagram.ARC_RADIUS * 2
    );
    this.height = this.item.height;
    this.boxUp = this.up = Math.max(
      this.item.up + Diagram.VERTICAL_SEPARATION,
      Diagram.ARC_RADIUS
    );
    if (this.label) {
      this.up += this.label.up + this.label.height + this.label.down;
    }
    this.down = Math.max(
      this.item.down + Diagram.VERTICAL_SEPARATION,
      Diagram.ARC_RADIUS
    );
    this.needsSpace = true;
    if (Diagram.DEBUG) {
      this.attrs["data-updown"] = this.up + " " + this.height + " " + this.down;
      this.attrs["data-type"] = "group";
    }
  };
  subclassOf(Group, FakeSVG);
  Group.prototype.needsSpace = true;
  Group.prototype.format = function(x, y, width) {
    var gaps = determineGaps(width, this.width);
    new Path(x, y).h(gaps[0]).addTo(this);
    new Path(x + gaps[0] + this.width, y + this.height).h(gaps[1]).addTo(this);
    x += gaps[0];

    new FakeSVG("rect", {
      x,
      y: y - this.boxUp,
      width: this.width,
      height: this.boxUp + this.height + this.down,
      rx: Diagram.ARC_RADIUS,
      ry: Diagram.ARC_RADIUS,
      class: "group-box"
    }).addTo(this);

    this.item.format(x, y, this.width).addTo(this);
    if (this.label) {
      this.label
        .format(
          x,
          y - (this.boxUp + this.label.down + this.label.height),
          this.label.width
        )
        .addTo(this);
    }

    return this;
  };

  var extraDiagramElements = {
    CommentWithLine,
    Group
  };

  const { travelers: travelers$1, identifyNode: identifyNode$1, NodeTypes: NodeTypes$8 } = ebnfTransform_1;
  const { traverse: traverse$2 } = traverse_1;
  const { optimizeAST: optimizeAST$1 } = structureOptimizer;
  const {
    Choice,
    Comment: Comment$1,
    ComplexDiagram,
    Diagram: Diagram$1,
    HorizontalChoice,
    NonTerminal,
    OneOrMore,
    Sequence,
    Skip,
    Stack,
    Terminal: Terminal$1
  } = railroadDiagrams;
  const { CommentWithLine: CommentWithLine$1, Group: Group$1 } = extraDiagramElements;

  const ExtraNodeTypes = {
    Skip: 100
  };

  const diagramTraverse = traverse$2(node => {
    const result = identifyNode$1(node);
    if (result !== undefined) return result;
    if (node.skip) return ExtraNodeTypes.Skip;
  })({
    ...travelers$1,
    [NodeTypes$8.Repetition]: (node, next) => ({
      ...node,
      repetition: next(node.repetition),
      ...(node.repeater && { repeater: next(node.repeater) })
    })
  });

  const baseDiagramRendering = {
    [NodeTypes$8.Production]: node =>
      node.complex ? ComplexDiagram(node.definition) : Diagram$1(node.definition),
    [NodeTypes$8.ExceptNonTerminal]: node =>
      NonTerminal(`${node.include} - ${node.exceptNonTerminal}`, {}),
    [NodeTypes$8.ExceptTerminal]: node =>
      NonTerminal(`${node.include} - ${node.exceptTerminal}`, {}),
    [NodeTypes$8.Terminal]: node => Terminal$1(node.terminal),
    [NodeTypes$8.NonTerminal]: node =>
      NonTerminal(node.nonTerminal, {
        // href: `#${dasherize(node.nonTerminal)}`
      }),
    [NodeTypes$8.Special]: node => {
      const sequence = NonTerminal(" " + node.specialSequence + " ", {});
      sequence.attrs.class = "special-sequence";
      return sequence;
    },
    [NodeTypes$8.Choice]: node => Choice(0, ...node.choice),
    [NodeTypes$8.Sequence]: node => Sequence(...node.sequence),
    [NodeTypes$8.Comment]: node => CommentWithLine$1(node.comment, {}),
    [NodeTypes$8.Group]: (node, production) => {
      if (node.comment) {
        const commentOnOptional = production.group && production.group.optional;
        if (commentOnOptional) {
          return Choice(
            0,
            CommentWithLine$1(node.comment, {}),
            node.group.items[1]
          );
        }
        return node.group
          ? Sequence(node.group, CommentWithLine$1(node.comment, {}))
          : CommentWithLine$1(node.comment, {});
      }

      return node.group;
    },
    [NodeTypes$8.Optional]: node => Choice(1, Skip(), node.optional),
    [ExtraNodeTypes.Skip]: () => Skip(),
    [NodeTypes$8.Repetition]: node => {
      if (node.skippable === true) {
        return Choice(1, Skip(), OneOrMore(node.repetition));
      }
      if (node.skippable === false) {
        return node.repeater
          ? OneOrMore(node.repetition, node.repeater)
          : OneOrMore(node.repetition);
      }
      if (node.amount !== undefined) {
        return OneOrMore(node.repetition, Comment$1(`${node.amount} ×`, {}));
      }
    }
  };

  const maxChoiceLength = max => ({
    [NodeTypes$8.Choice]: node => {
      const makeChoice = items => new Choice(0, items);
      const choiceOptions = node.items;
      const choiceLists = [];
      while (choiceOptions.length > max) {
        const subList = choiceOptions.splice(0, max);
        choiceLists.push(makeChoice(subList));
      }
      choiceLists.push(makeChoice(choiceOptions));
      return choiceLists.length > 1
        ? HorizontalChoice(...choiceLists)
        : choiceLists[0];
    }
  });

  const optimizeSequenceLength = {
    [NodeTypes$8.Sequence]: node => {
      if (node.width > 450) {
        const subSequences = node.items
          .reduce(
            (totals, elem, index, list) => {
              const lastList = totals.slice(-1)[0];
              lastList.push(elem);
              const currentLength = lastList.reduce(
                (acc, item) => acc + item.width,
                0
              );
              const remainingLength = list
                .slice(index + 1)
                .reduce((acc, item) => acc + item.width, 0);
              if (
                currentLength + remainingLength > 400 &&
                currentLength >= 250 &&
                remainingLength > 100
              ) {
                totals.push([]);
              }
              return totals;
            },
            [[]]
          )
          .filter(array => array.length > 0);
        return Stack(
          ...subSequences.map(subSequence => Sequence(...subSequence))
        );
      }
      return node;
    }
  };

  const MAX_CHOICE_LENGTH = 10;

  const identity = x => x;
  const dot = f => g => x => f(g(x));

  const createDiagram = (production, metadata, ast, options) => {
    const expanded = [];

    const renderDiagram = dot(
      diagramTraverse(
        [
          baseDiagramRendering,
          options.optimizeDiagrams && maxChoiceLength(MAX_CHOICE_LENGTH),
          options.diagramWrap &&
            options.optimizeDiagrams &&
            optimizeSequenceLength,
          options.overview && {
            [NodeTypes$8.NonTerminal]: node => {
              const expand =
                !expanded.includes(node.text) &&
                metadata[node.text] &&
                !metadata[node.text].characterSet;

              const nested = ast.find(item => item.identifier === node.text);
              if (!expand || !nested) {
                return node;
              }
              expanded.push(node.text);

              return Group$1(
                renderDiagram(nested.definition),
                Comment$1(node.text, { 
                  // href: `#${dasherize(node.text)}` 
                })
              );
            }
          }
        ].filter(Boolean)
      )
    )(options.optimizeDiagrams === false ? identity : optimizeAST$1);

    const diagram = renderDiagram({
      ...production,
      complex: options.complex
    });

    return diagram
      .toString()
      .replace(/height="(\d+)"/, `style="max-height: $1px;"`);
  };

  var buildDiagram = {
    createDiagram
  };
  var buildDiagram_1 = buildDiagram.createDiagram;

  var ebnfParser_1 = createCommonjsModule(function (module, exports) {
  /* parser generated by jison 0.4.18 */
  /*
    Returns a Parser object of the following structure:

    Parser: {
      yy: {}
    }

    Parser.prototype: {
      yy: {},
      trace: function(),
      symbols_: {associative list: name ==> number},
      terminals_: {associative list: number ==> name},
      productions_: [...],
      performAction: function anonymous(yytext, yyleng, yylineno, yy, yystate, $$, _$),
      table: [...],
      defaultActions: {...},
      parseError: function(str, hash),
      parse: function(input),

      lexer: {
          EOF: 1,
          parseError: function(str, hash),
          setInput: function(input),
          input: function(),
          unput: function(str),
          more: function(),
          less: function(n),
          pastInput: function(),
          upcomingInput: function(),
          showPosition: function(),
          test_match: function(regex_match_array, rule_index),
          next: function(),
          lex: function(),
          begin: function(condition),
          popState: function(),
          _currentRules: function(),
          topState: function(),
          pushState: function(condition),

          options: {
              ranges: boolean           (optional: true ==> token location info will include a .range[] member)
              flex: boolean             (optional: true ==> flex-like lexing behaviour where the rules are tested exhaustively to find the longest match)
              backtrack_lexer: boolean  (optional: true ==> lexer regexes are tested in order and for each matching regex the action code is invoked; the lexer terminates the scan when a token is returned by the action code)
          },

          performAction: function(yy, yy_, $avoiding_name_collisions, YY_START),
          rules: [...],
          conditions: {associative list: name ==> set},
      }
    }


    token location info (@$, _$, etc.): {
      first_line: n,
      last_line: n,
      first_column: n,
      last_column: n,
      range: [start_number, end_number]       (where the numbers are indexes into the input string, regular zero-based)
    }


    the parseError function receives a 'hash' object with these members for lexer and parser errors: {
      text:        (matched text)
      token:       (the produced terminal token, if any)
      line:        (yylineno)
    }
    while parser (grammar) errors will also provide these members, i.e. parser errors deliver a superset of attributes: {
      loc:         (yylloc)
      expected:    (string describing the set of expected tokens)
      recoverable: (boolean: TRUE when the parser has a error recovery rule available for this particular error)
    }
  */
  var ebnfParser = (function(){
  var o=function(k,v,o,l){for(o=o||{},l=k.length;l--;o[k[l]]=v);return o},$V0=[1,4],$V1=[1,6],$V2=[5,7,29],$V3=[1,20],$V4=[1,11],$V5=[1,12],$V6=[1,13],$V7=[1,15],$V8=[1,21],$V9=[1,22],$Va=[1,24],$Vb=[1,25],$Vc=[10,12,13,15,17,19,29],$Vd=[10,12,13,15,17,19];
  var parser = {trace: function trace () { },
  yy: {},
  symbols_: {"error":2,"grammar":3,"production_list":4,"EOF":5,"production":6,"IDENTIFIER":7,"=":8,"rhs":9,";":10,"comment":11,",":12,"|":13,"{":14,"}":15,"(":16,")":17,"[":18,"]":19,"DIGIT":20,"*":21,"identifier":22,"terminal":23,"exception":24,"specialSequence":25,"-":26,"STRING":27,"SEQUENCE":28,"COMMENT":29,"$accept":0,"$end":1},
  terminals_: {2:"error",5:"EOF",7:"IDENTIFIER",8:"=",10:";",12:",",13:"|",14:"{",15:"}",16:"(",17:")",18:"[",19:"]",20:"DIGIT",21:"*",26:"-",27:"STRING",28:"SEQUENCE",29:"COMMENT"},
  productions_: [0,[3,2],[4,2],[4,1],[6,4],[6,1],[9,3],[9,3],[9,3],[9,3],[9,3],[9,4],[9,3],[9,2],[9,1],[9,1],[9,1],[9,1],[24,3],[24,3],[22,1],[25,1],[23,1],[11,1]],
  performAction: function anonymous(yytext, yyleng, yylineno, yy, yystate /* action[1] */, $$ /* vstack */, _$ /* lstack */) {
  /* this == yyval */

  var $0 = $$.length - 1;
  switch (yystate) {
  case 1:
   return $$[$0-1]; 
  case 2:
   this.$ = $$[$0-1].concat($$[$0]); 
  break;
  case 3:
   this.$ = [$$[$0]]; 
  break;
  case 4:
   this.$ = { identifier: $$[$0-3].trim(), definition: $$[$0-1], location: _$[$0-3].first_line };  
  break;
  case 6:
   this.$ = $$[$0-2].sequence ? { sequence: $$[$0-2].sequence.concat($$[$0]) } : { sequence: [$$[$0-2], $$[$0]] }; 
  break;
  case 7:
   this.$ = $$[$0-2].choice ? { choice: $$[$0-2].choice.concat($$[$0]) } : { choice: [$$[$0-2], $$[$0]] }; 
  break;
  case 8:
   this.$ = { repetition: $$[$0-1], skippable: true }; 
  break;
  case 9:
   this.$ = { group: $$[$0-1] }; 
  break;
  case 10:
   this.$ = { optional: $$[$0-1] }; 
  break;
  case 11:
   this.$ = { comment: $$[$0-3].comment, before: true, group: { optional: $$[$0-1] } }; 
  break;
  case 12:
   this.$ = { repetition: $$[$0], amount: $$[$0-2] }; 
  break;
  case 13:
   this.$ = { ...$$[$0], group: $$[$0-1] }; 
  break;
  case 18:
   this.$ = { include: $$[$0-2].trim(), exceptNonTerminal: $$[$0].trim() }; 
  break;
  case 19:
   this.$ = { include: $$[$0-2].trim(), exceptTerminal: $$[$0].slice(1, -1) }; 
  break;
  case 20:
   this.$ = { nonTerminal: $$[$0].trim() }; 
  break;
  case 21:
   this.$ = { specialSequence: $$[$0].slice(1, -1).trim() }; 
  break;
  case 22:
   this.$ = { terminal: $$[$0].slice(1, -1) }; 
  break;
  case 23:
   this.$ = {comment: $$[$0].slice(2, -2) }; 
  break;
  }
  },
  table: [{3:1,4:2,6:3,7:$V0,11:5,29:$V1},{1:[3]},{5:[1,7],6:8,7:$V0,11:5,29:$V1},o($V2,[2,3]),{8:[1,9]},o($V2,[2,5]),o([5,7,10,12,13,15,17,18,19,29],[2,23]),{1:[2,1]},o($V2,[2,2]),{7:$V3,9:10,11:14,14:$V4,16:$V5,18:$V6,20:$V7,22:16,23:17,24:18,25:19,27:$V8,28:$V9,29:$V1},{10:[1,23],11:26,12:$Va,13:$Vb,29:$V1},{7:$V3,9:27,11:14,14:$V4,16:$V5,18:$V6,20:$V7,22:16,23:17,24:18,25:19,27:$V8,28:$V9,29:$V1},{7:$V3,9:28,11:14,14:$V4,16:$V5,18:$V6,20:$V7,22:16,23:17,24:18,25:19,27:$V8,28:$V9,29:$V1},{7:$V3,9:29,11:14,14:$V4,16:$V5,18:$V6,20:$V7,22:16,23:17,24:18,25:19,27:$V8,28:$V9,29:$V1},{18:[1,30]},{21:[1,31]},o($Vc,[2,14]),o($Vc,[2,15]),o($Vc,[2,16]),o($Vc,[2,17]),o($Vc,[2,20],{26:[1,32]}),o($Vc,[2,22]),o($Vc,[2,21]),o($V2,[2,4]),{7:$V3,9:33,11:14,14:$V4,16:$V5,18:$V6,20:$V7,22:16,23:17,24:18,25:19,27:$V8,28:$V9,29:$V1},{7:$V3,9:34,11:14,14:$V4,16:$V5,18:$V6,20:$V7,22:16,23:17,24:18,25:19,27:$V8,28:$V9,29:$V1},o($Vc,[2,13]),{11:26,12:$Va,13:$Vb,15:[1,35],29:$V1},{11:26,12:$Va,13:$Vb,17:[1,36],29:$V1},{11:26,12:$Va,13:$Vb,19:[1,37],29:$V1},{7:$V3,9:38,11:14,14:$V4,16:$V5,18:$V6,20:$V7,22:16,23:17,24:18,25:19,27:$V8,28:$V9,29:$V1},{7:$V3,9:39,11:14,14:$V4,16:$V5,18:$V6,20:$V7,22:16,23:17,24:18,25:19,27:$V8,28:$V9,29:$V1},{7:[1,40],27:[1,41]},o($Vd,[2,6],{11:26,29:$V1}),o([10,13,15,17,19],[2,7],{11:26,12:$Va,29:$V1}),o($Vc,[2,8]),o($Vc,[2,9]),o($Vc,[2,10]),{11:26,12:$Va,13:$Vb,19:[1,42],29:$V1},o($Vd,[2,12],{11:26,29:$V1}),o($Vc,[2,18]),o($Vc,[2,19]),o($Vc,[2,11])],
  defaultActions: {7:[2,1]},
  parseError: function parseError (str, hash) {
      if (hash.recoverable) {
          this.trace(str);
      } else {
          var error = new Error(str);
          error.hash = hash;
          throw error;
      }
  },
  parse: function parse(input) {
      var self = this, stack = [0], vstack = [null], lstack = [], table = this.table, yytext = '', yylineno = 0, yyleng = 0, TERROR = 2, EOF = 1;
      var args = lstack.slice.call(arguments, 1);
      var lexer = Object.create(this.lexer);
      var sharedState = { yy: {} };
      for (var k in this.yy) {
          if (Object.prototype.hasOwnProperty.call(this.yy, k)) {
              sharedState.yy[k] = this.yy[k];
          }
      }
      lexer.setInput(input, sharedState.yy);
      sharedState.yy.lexer = lexer;
      sharedState.yy.parser = this;
      if (typeof lexer.yylloc == 'undefined') {
          lexer.yylloc = {};
      }
      var yyloc = lexer.yylloc;
      lstack.push(yyloc);
      var ranges = lexer.options && lexer.options.ranges;
      if (typeof sharedState.yy.parseError === 'function') {
          this.parseError = sharedState.yy.parseError;
      } else {
          this.parseError = Object.getPrototypeOf(this).parseError;
      }
      
          var lex = function () {
              var token;
              token = lexer.lex() || EOF;
              if (typeof token !== 'number') {
                  token = self.symbols_[token] || token;
              }
              return token;
          };
      var symbol, state, action, r, yyval = {}, p, len, newState, expected;
      while (true) {
          state = stack[stack.length - 1];
          if (this.defaultActions[state]) {
              action = this.defaultActions[state];
          } else {
              if (symbol === null || typeof symbol == 'undefined') {
                  symbol = lex();
              }
              action = table[state] && table[state][symbol];
          }
                      if (typeof action === 'undefined' || !action.length || !action[0]) {
                  var errStr = '';
                  expected = [];
                  for (p in table[state]) {
                      if (this.terminals_[p] && p > TERROR) {
                          expected.push('\'' + this.terminals_[p] + '\'');
                      }
                  }
                  if (lexer.showPosition) {
                      errStr = 'Parse error on line ' + (yylineno + 1) + ':\n' + lexer.showPosition() + '\nExpecting ' + expected.join(', ') + ', got \'' + (this.terminals_[symbol] || symbol) + '\'';
                  } else {
                      errStr = 'Parse error on line ' + (yylineno + 1) + ': Unexpected ' + (symbol == EOF ? 'end of input' : '\'' + (this.terminals_[symbol] || symbol) + '\'');
                  }
                  this.parseError(errStr, {
                      text: lexer.match,
                      token: this.terminals_[symbol] || symbol,
                      line: lexer.yylineno,
                      loc: yyloc,
                      expected: expected
                  });
              }
          if (action[0] instanceof Array && action.length > 1) {
              throw new Error('Parse Error: multiple actions possible at state: ' + state + ', token: ' + symbol);
          }
          switch (action[0]) {
          case 1:
              stack.push(symbol);
              vstack.push(lexer.yytext);
              lstack.push(lexer.yylloc);
              stack.push(action[1]);
              symbol = null;
              {
                  yyleng = lexer.yyleng;
                  yytext = lexer.yytext;
                  yylineno = lexer.yylineno;
                  yyloc = lexer.yylloc;
              }
              break;
          case 2:
              len = this.productions_[action[1]][1];
              yyval.$ = vstack[vstack.length - len];
              yyval._$ = {
                  first_line: lstack[lstack.length - (len || 1)].first_line,
                  last_line: lstack[lstack.length - 1].last_line,
                  first_column: lstack[lstack.length - (len || 1)].first_column,
                  last_column: lstack[lstack.length - 1].last_column
              };
              if (ranges) {
                  yyval._$.range = [
                      lstack[lstack.length - (len || 1)].range[0],
                      lstack[lstack.length - 1].range[1]
                  ];
              }
              r = this.performAction.apply(yyval, [
                  yytext,
                  yyleng,
                  yylineno,
                  sharedState.yy,
                  action[1],
                  vstack,
                  lstack
              ].concat(args));
              if (typeof r !== 'undefined') {
                  return r;
              }
              if (len) {
                  stack = stack.slice(0, -1 * len * 2);
                  vstack = vstack.slice(0, -1 * len);
                  lstack = lstack.slice(0, -1 * len);
              }
              stack.push(this.productions_[action[1]][0]);
              vstack.push(yyval.$);
              lstack.push(yyval._$);
              newState = table[stack[stack.length - 2]][stack[stack.length - 1]];
              stack.push(newState);
              break;
          case 3:
              return true;
          }
      }
      return true;
  }};
  /* generated by jison-lex 0.3.4 */
  var lexer = (function(){
  var lexer = ({

  EOF:1,

  parseError:function parseError(str, hash) {
          if (this.yy.parser) {
              this.yy.parser.parseError(str, hash);
          } else {
              throw new Error(str);
          }
      },

  // resets the lexer, sets new input
  setInput:function (input, yy) {
          this.yy = yy || this.yy || {};
          this._input = input;
          this._more = this._backtrack = this.done = false;
          this.yylineno = this.yyleng = 0;
          this.yytext = this.matched = this.match = '';
          this.conditionStack = ['INITIAL'];
          this.yylloc = {
              first_line: 1,
              first_column: 0,
              last_line: 1,
              last_column: 0
          };
          if (this.options.ranges) {
              this.yylloc.range = [0,0];
          }
          this.offset = 0;
          return this;
      },

  // consumes and returns one char from the input
  input:function () {
          var ch = this._input[0];
          this.yytext += ch;
          this.yyleng++;
          this.offset++;
          this.match += ch;
          this.matched += ch;
          var lines = ch.match(/(?:\r\n?|\n).*/g);
          if (lines) {
              this.yylineno++;
              this.yylloc.last_line++;
          } else {
              this.yylloc.last_column++;
          }
          if (this.options.ranges) {
              this.yylloc.range[1]++;
          }

          this._input = this._input.slice(1);
          return ch;
      },

  // unshifts one char (or a string) into the input
  unput:function (ch) {
          var len = ch.length;
          var lines = ch.split(/(?:\r\n?|\n)/g);

          this._input = ch + this._input;
          this.yytext = this.yytext.substr(0, this.yytext.length - len);
          //this.yyleng -= len;
          this.offset -= len;
          var oldLines = this.match.split(/(?:\r\n?|\n)/g);
          this.match = this.match.substr(0, this.match.length - 1);
          this.matched = this.matched.substr(0, this.matched.length - 1);

          if (lines.length - 1) {
              this.yylineno -= lines.length - 1;
          }
          var r = this.yylloc.range;

          this.yylloc = {
              first_line: this.yylloc.first_line,
              last_line: this.yylineno + 1,
              first_column: this.yylloc.first_column,
              last_column: lines ?
                  (lines.length === oldLines.length ? this.yylloc.first_column : 0)
                   + oldLines[oldLines.length - lines.length].length - lines[0].length :
                this.yylloc.first_column - len
          };

          if (this.options.ranges) {
              this.yylloc.range = [r[0], r[0] + this.yyleng - len];
          }
          this.yyleng = this.yytext.length;
          return this;
      },

  // When called from action, caches matched text and appends it on next action
  more:function () {
          this._more = true;
          return this;
      },

  // When called from action, signals the lexer that this rule fails to match the input, so the next matching rule (regex) should be tested instead.
  reject:function () {
          if (this.options.backtrack_lexer) {
              this._backtrack = true;
          } else {
              return this.parseError('Lexical error on line ' + (this.yylineno + 1) + '. You can only invoke reject() in the lexer when the lexer is of the backtracking persuasion (options.backtrack_lexer = true).\n' + this.showPosition(), {
                  text: "",
                  token: null,
                  line: this.yylineno
              });

          }
          return this;
      },

  // retain first n characters of the match
  less:function (n) {
          this.unput(this.match.slice(n));
      },

  // displays already matched input, i.e. for error messages
  pastInput:function () {
          var past = this.matched.substr(0, this.matched.length - this.match.length);
          return (past.length > 20 ? '...':'') + past.substr(-20).replace(/\n/g, "");
      },

  // displays upcoming input, i.e. for error messages
  upcomingInput:function () {
          var next = this.match;
          if (next.length < 20) {
              next += this._input.substr(0, 20-next.length);
          }
          return (next.substr(0,20) + (next.length > 20 ? '...' : '')).replace(/\n/g, "");
      },

  // displays the character position where the lexing error occurred, i.e. for error messages
  showPosition:function () {
          var pre = this.pastInput();
          var c = new Array(pre.length + 1).join("-");
          return pre + this.upcomingInput() + "\n" + c + "^";
      },

  // test the lexed token: return FALSE when not a match, otherwise return token
  test_match:function(match, indexed_rule) {
          var token,
              lines,
              backup;

          if (this.options.backtrack_lexer) {
              // save context
              backup = {
                  yylineno: this.yylineno,
                  yylloc: {
                      first_line: this.yylloc.first_line,
                      last_line: this.last_line,
                      first_column: this.yylloc.first_column,
                      last_column: this.yylloc.last_column
                  },
                  yytext: this.yytext,
                  match: this.match,
                  matches: this.matches,
                  matched: this.matched,
                  yyleng: this.yyleng,
                  offset: this.offset,
                  _more: this._more,
                  _input: this._input,
                  yy: this.yy,
                  conditionStack: this.conditionStack.slice(0),
                  done: this.done
              };
              if (this.options.ranges) {
                  backup.yylloc.range = this.yylloc.range.slice(0);
              }
          }

          lines = match[0].match(/(?:\r\n?|\n).*/g);
          if (lines) {
              this.yylineno += lines.length;
          }
          this.yylloc = {
              first_line: this.yylloc.last_line,
              last_line: this.yylineno + 1,
              first_column: this.yylloc.last_column,
              last_column: lines ?
                           lines[lines.length - 1].length - lines[lines.length - 1].match(/\r?\n?/)[0].length :
                           this.yylloc.last_column + match[0].length
          };
          this.yytext += match[0];
          this.match += match[0];
          this.matches = match;
          this.yyleng = this.yytext.length;
          if (this.options.ranges) {
              this.yylloc.range = [this.offset, this.offset += this.yyleng];
          }
          this._more = false;
          this._backtrack = false;
          this._input = this._input.slice(match[0].length);
          this.matched += match[0];
          token = this.performAction.call(this, this.yy, this, indexed_rule, this.conditionStack[this.conditionStack.length - 1]);
          if (this.done && this._input) {
              this.done = false;
          }
          if (token) {
              return token;
          } else if (this._backtrack) {
              // recover context
              for (var k in backup) {
                  this[k] = backup[k];
              }
              return false; // rule action called reject() implying the next rule should be tested instead.
          }
          return false;
      },

  // return next match in input
  next:function () {
          if (this.done) {
              return this.EOF;
          }
          if (!this._input) {
              this.done = true;
          }

          var token,
              match,
              tempMatch,
              index;
          if (!this._more) {
              this.yytext = '';
              this.match = '';
          }
          var rules = this._currentRules();
          for (var i = 0; i < rules.length; i++) {
              tempMatch = this._input.match(this.rules[rules[i]]);
              if (tempMatch && (!match || tempMatch[0].length > match[0].length)) {
                  match = tempMatch;
                  index = i;
                  if (this.options.backtrack_lexer) {
                      token = this.test_match(tempMatch, rules[i]);
                      if (token !== false) {
                          return token;
                      } else if (this._backtrack) {
                          match = false;
                          continue; // rule action called reject() implying a rule MISmatch.
                      } else {
                          // else: this is a lexer rule which consumes input without producing a token (e.g. whitespace)
                          return false;
                      }
                  } else if (!this.options.flex) {
                      break;
                  }
              }
          }
          if (match) {
              token = this.test_match(match, rules[index]);
              if (token !== false) {
                  return token;
              }
              // else: this is a lexer rule which consumes input without producing a token (e.g. whitespace)
              return false;
          }
          if (this._input === "") {
              return this.EOF;
          } else {
              return this.parseError('Lexical error on line ' + (this.yylineno + 1) + '. Unrecognized text.\n' + this.showPosition(), {
                  text: "",
                  token: null,
                  line: this.yylineno
              });
          }
      },

  // return next match that has a token
  lex:function lex () {
          var r = this.next();
          if (r) {
              return r;
          } else {
              return this.lex();
          }
      },

  // activates a new lexer condition state (pushes the new lexer condition state onto the condition stack)
  begin:function begin (condition) {
          this.conditionStack.push(condition);
      },

  // pop the previously active lexer condition state off the condition stack
  popState:function popState () {
          var n = this.conditionStack.length - 1;
          if (n > 0) {
              return this.conditionStack.pop();
          } else {
              return this.conditionStack[0];
          }
      },

  // produce the lexer rule set which is active for the currently active lexer condition state
  _currentRules:function _currentRules () {
          if (this.conditionStack.length && this.conditionStack[this.conditionStack.length - 1]) {
              return this.conditions[this.conditionStack[this.conditionStack.length - 1]].rules;
          } else {
              return this.conditions["INITIAL"].rules;
          }
      },

  // return the currently active lexer condition state; when an index argument is provided it produces the N-th previous condition state, if available
  topState:function topState (n) {
          n = this.conditionStack.length - 1 - Math.abs(n || 0);
          if (n >= 0) {
              return this.conditionStack[n];
          } else {
              return "INITIAL";
          }
      },

  // alias for begin(condition)
  pushState:function pushState (condition) {
          this.begin(condition);
      },

  // return the number of states currently on the stack
  stateStackSize:function stateStackSize() {
          return this.conditionStack.length;
      },
  options: {},
  performAction: function anonymous(yy,yy_,$avoiding_name_collisions,YY_START) {
  switch($avoiding_name_collisions) {
  case 0: /* skip whitespace */
  break;
  case 1: return 29; 
  case 2: return 7; 
  case 3: return 20; 
  case 4: return 18; 
  case 5: return 19; 
  case 6: return 14; 
  case 7: return 15; 
  case 8: return 21; 
  case 9: return 8; 
  case 10: return 10; 
  case 11: return 10; 
  case 12: return 12; 
  case 13: return 13; 
  case 14: return 13; 
  case 15: return 13; 
  case 16: return 26; 
  case 17: return 14; 
  case 18: return 15; 
  case 19: return 16; 
  case 20: return 17; 
  case 21: return 18; 
  case 22: return 19; 
  case 23: return 27; 
  case 24: return 27; 
  case 25: return 28; 
  case 26: return 5; 
  case 27: return yy_.yytext; 
  }
  },
  rules: [/^(?:\s+)/,/^(?:\(\*([^*]|\*(?=[^)]))*\*\))/,/^(?:[A-Za-z][A-Za-z0-9 _]*)/,/^(?:[0-9]+)/,/^(?:\(\/)/,/^(?:\/\))/,/^(?:\(:)/,/^(?::\))/,/^(?:\*)/,/^(?:=)/,/^(?:;)/,/^(?:\.)/,/^(?:,)/,/^(?:\|)/,/^(?:\/)/,/^(?:!)/,/^(?:-)/,/^(?:\{)/,/^(?:\})/,/^(?:\()/,/^(?:\))/,/^(?:\[)/,/^(?:\])/,/^(?:"[^"]+")/,/^(?:'[^']+')/,/^(?:\?[^\?]+\?)/,/^(?:$)/,/^(?:.*)/],
  conditions: {"INITIAL":{"rules":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27],"inclusive":true}}
  });
  return lexer;
  })();
  parser.lexer = lexer;
  function Parser () {
    this.yy = {};
  }
  Parser.prototype = parser;parser.Parser = Parser;
  return new Parser;
  })();


  if (typeof commonjsRequire !== 'undefined' && 'object' !== 'undefined') {
  exports.parser = ebnfParser;
  exports.Parser = ebnfParser.Parser;
  exports.parse = function () { return ebnfParser.parse.apply(ebnfParser, arguments); };
  exports.main = function commonjsMain (args) {
      if (!args[1]) {
          console.log('Usage: '+args[0]+' FILE');
          process.exit(1);
      }
      var source = fs.readFileSync(path.normalize(args[1]), "utf8");
      return exports.parser.parse(source);
  };
  if ( commonjsRequire.main === module) {
    exports.main(process.argv.slice(1));
  }
  }
  });
  var ebnfParser_2 = ebnfParser_1.parser;
  var ebnfParser_3 = ebnfParser_1.Parser;
  var ebnfParser_4 = ebnfParser_1.parse;
  var ebnfParser_5 = ebnfParser_1.main;

  const getReferences = production => {
    if (production.definition) {
      return getReferences(production.definition);
    }
    if (production.terminal) {
      return [];
    }
    if (production.nonTerminal) {
      return [production.nonTerminal];
    }
    if (production.choice) {
      return production.choice
        .map(item => getReferences(item))
        .reduce((acc, item) => acc.concat(item), [])
        .filter(Boolean);
    }
    if (production.sequence) {
      return production.sequence
        .map(item => getReferences(item))
        .reduce((acc, item) => acc.concat(item), [])
        .filter(Boolean);
    }
    if (production.repetition) {
      return getReferences(production.repetition);
    }
    if (production.optional) {
      return getReferences(production.optional);
    }
    if (production.group) {
      return getReferences(production.group);
    }
    if (production.exceptNonTerminal) {
      return [production.exceptNonTerminal, production.include];
    }
    if (production.exceptTerminal) {
      return [production.include];
    }
    return [];
  };

  const searchReferencesToIdentifier = (identifier, productions) =>
    productions
      .filter(production =>
        getReferences(production).some(ref => ref === identifier)
      )
      .map(production => production.identifier);

  const searchReferencesFromIdentifier = (identifier, ast) =>
    ast
      .filter(production => production.identifier === identifier)
      .map(production => getReferences(production))
      .reduce((acc, item) => acc.concat(item), [])
      .filter(Boolean)
      .filter((item, index, list) => list.indexOf(item) === index);

  var references = {
    getReferences,
    searchReferencesFromIdentifier,
    searchReferencesToIdentifier
  };
  var references_2 = references.searchReferencesFromIdentifier;

  const {
    searchReferencesFromIdentifier: searchReferencesFromIdentifier$1,
    searchReferencesToIdentifier: searchReferencesToIdentifier$1
  } = references;

  const createAlphabeticalToc = ast =>
    ast
      .filter(production => production.identifier)
      .map(production => production.identifier)
      .reduce((acc, item) => acc.concat(item), [])
      .filter((item, index, list) => list.indexOf(item) === index)
      .sort()
      .map(node => ({ name: node }));

  const isCharacterSet = production => {
    const rootChoice = production.definition && production.definition.choice;
    if (!rootChoice) {
      return false;
    }
    return rootChoice.every(element => element.terminal);
  };

  const createPath = (production, ast, path, cache = {}) => {
    const leaf = {
      name: production.identifier,
      characterSet: isCharacterSet(production)
    };
    if (path.includes(leaf.name)) {
      leaf.recursive = true;
    } else {
      const subPath = path.concat(production.identifier);
      const cacheEntry = cache[production.identifier];
      const children =
        cacheEntry !== undefined
          ? cacheEntry
          : searchReferencesFromIdentifier$1(production.identifier, ast)
              // Protect against missing references
              .filter(child =>
                ast.find(production => production.identifier === child)
              )
              .map(child =>
                createPath(
                  ast.find(production => production.identifier === child),
                  ast,
                  subPath,
                  cache
                )
              );
      cache[production.identifier] = children;

      if (children.length > 0) {
        leaf.children = children;

        const rootChoice = production.definition && production.definition.choice;
        if (
          rootChoice &&
          rootChoice.every(element => element.terminal || element.nonTerminal) &&
          children.every(child => child.characterSet)
        ) {
          leaf.characterSet = true;
        }
      }
    }

    return leaf;
  };

  const flatList = children =>
    children
      .map(child => [child.name].concat(flatList(child.children || [])))
      .reduce((acc, elem) => acc.concat(elem), []);

  const createStructuralToc = ast => {
    const productions = ast.filter(production => production.identifier);
    const declarations = productions.map(production => production.identifier);
    const cache = {};

    const cleanRoots = productions
      .filter(
        production =>
          searchReferencesToIdentifier$1(production.identifier, productions)
            .length === 0
      )
      .map(production => createPath(production, productions, [], cache));

    const recursiveTrees = productions
      .map(production => createPath(production, productions, [], cache))
      // Check if tree is recursive
      .filter(tree => flatList(tree.children || []).includes(tree.name))
      // Tree contained in a clean (non-recursive) root? remove.
      .filter(
        recursiveTree =>
          !cleanRoots
            .map(root => flatList(root.children || []))
            .some(list => list.includes(recursiveTree.name))
      )
      // The trees left are now
      // a -> b -> c -> a, vs.
      // b -> c -> a -> b, vs.
      // c -> a -> b -> c. Check which one is defined first, that one wins
      .filter((root, index, list) => {
        const indices = flatList(root.children || [])
          .filter(node => node !== root.name)
          .map(node => list.map(p => p.name).indexOf(node))
          .filter(e => e !== -1);
        const childIndex = Math.min(...indices);

        return index < childIndex;
      });

    return cleanRoots
      .concat(recursiveTrees)
      .sort(
        (a, b) => declarations.indexOf(a.name) - declarations.indexOf(b.name)
      );
  };

  const createDefinitionMetadata = (structuralToc, level = 0) => {
    const metadata = {};
    structuralToc.forEach(item => {
      const data = metadata[item.name] || { counted: 0 };
      if (level === 0) {
        data["root"] = true;
      }
      if (item.recursive) {
        data["recursive"] = true;
      }
      if (item.characterSet) {
        data["characterSet"] = true;
      }
      data["counted"]++;
      metadata[item.name] = data;

      if (item.children) {
        const childData = createDefinitionMetadata(item.children, level + 1);
        Object.entries(childData).forEach(([name, cData]) => {
          const data = metadata[name] || { counted: 0 };
          metadata[name] = {
            ...data,
            ...cData,
            counted: cData.counted + data.counted
          };
        });
      }
    });
    const values = Object.values(metadata);
    const total = values.reduce((acc, item) => acc + item.counted, 0);
    const average = total / values.length;
    Object.entries(metadata).forEach(([varName, value]) => {
      metadata[varName].common = value.counted > average;
    });
    return metadata;
  };

  var toc = {
    createAlphabeticalToc,
    createDefinitionMetadata,
    createStructuralToc
  };
  var toc_2 = toc.createDefinitionMetadata;
  var toc_3 = toc.createStructuralToc;

  var parseAST = function parseAST(input) {
    try {
      return ebnfParser_4(input);
    } catch (e) {
      var error = new Error(e.message);

      if (e.hash) {
        error.hash = e.hash; // backwards compatibility

        error.data = {
          expected: e.hash.expected,
          token: "'".concat(e.hash.token[0], "'"),
          line: e.hash.line + 1,
          pos: e.hash.loc.last_column + 1
        };
      }

      throw error;
    }
  };

  var createSVG = function createSVG(ast) {
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    var structuralToc = toc_3(ast);
    var metadata = toc_2(structuralToc);
    var contents = ast.map(function (production) {
      var outgoingReferences = references_2(production.identifier, ast);
      var diagram = buildDiagram_1(production, metadata, ast, _objectSpread2(_objectSpread2({}, options), {}, {
        overview: metadata[production.identifier] && metadata[production.identifier].root && options.overviewDiagram,
        complex: outgoingReferences.length > 0
      }));
      return diagram;
    })[0];
    return contents;
  };

  function main () {
    var ebnf = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    return createSVG(parseAST(ebnf), _objectSpread2({
      overviewDiagram: true,
      // diagramWrap: true,
      textFormatting: true,
      optimizeDiagrams: true,
      optimizeText: true
    }, options));
  }

  return main;

})));
