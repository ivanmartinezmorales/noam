var noam = {};

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = noam;
} else {
  window.noam = noam;
}

noam.fsm = {};
noam.util = {};

noam.fsm.epsilonSymbol = '$';
noam.fsm.dfaType = 'DFA';
noam.fsm.nfaType = 'NFA';
noam.fsm.enfaType = 'eNFA';

// "deep" compare of two objects
// taken from http://stackoverflow.com/questions/1068834/object-comparison-in-javascript
noam.util.areEquivalent = function(object1, object2) {
  if (typeof object1 === 'undefined' || typeof object2 === 'undefined') {
    return false;
  }

  if (object1 === object2) {
    return true;
  }

  if (!(object1 instanceof Object) || !(object2 instanceof Object) ) {
    return false;
  }

  if (object1.constructor !== object2.constructor) {
    return false;
  }

  for (var p in object1) {
    if (!(object1.hasOwnProperty(p))) {
      continue;
    }

    if (!(object2.hasOwnProperty(p))) {
      return false;
    }

    if (object1[p] === object2[p]) {
      continue;
    }

    if (typeof(object1[p]) !== "object") {
      return false;
    }

    if (!(noam.util.areEquivalent(object1[p], object2[p]))) {
      return false;
    }
  }

  for (p in object2) {
    if (object2.hasOwnProperty(p) && !(object1.hasOwnProperty(p))) {
      return false;
    }
  }

  return true;
};

// check if array arr contains obj starting from index startIndex
noam.util.contains = function(arr, obj, startIndex) {
  startIndex = startIndex ? startIndex : 0;

  for (var i=startIndex; i<arr.length; i++) {
    if (noam.util.areEquivalent(arr[i], obj)) {
      return true;
    }
  }

  return false;
};

// returns the index of the leftmost obj instance in arr starting from startIndex or -1 
// if no instance of obj is found
noam.util.index = function(arr, obj, startIndex) {
  var i = startIndex || 0;
  while (i < arr.length) {
    if (noam.util.areEquivalent(arr[i], obj)) {
      return i;
    }
    i++;
  }
  return -1;
}

// check if array arr1 contains all elements from array arr2
noam.util.containsAll = function(arr1, arr2) {
  for (var i=0; i<arr2.length; i++) {
    if (!(noam.util.contains(arr1, arr2[i]))) {
      return false;
    }
  }

  return true;
};

// check if array arr1 contains any element from array arr2
noam.util.containsAny = function(arr1, arr2) {
  for (var i=0; i<arr2.length; i++) {
    if (noam.util.contains(arr1, arr2[i])) {
      return true;
    }
  }

  return false;
};

// check if arrays arr1 and arr2 contain the same elements
noam.util.areEqualSets = function(arr1, arr2) {
  if (arr1.length !== arr2.length) {
    return false;
  }

  for (var i=0; i<arr1.length; i++) {
    if (!(noam.util.contains(arr2, arr1[i]))) {
      return false;
    }
  }

  return true;
};

// check if array arr1 contains the set obj
noam.util.containsSet = function(arr1, obj) {
  for (var i=0; i<arr1.length; i++) {
    if (noam.util.areEqualSets(arr1[i], obj)) {
      return true;
    }
  }

  return false;
};

// returns an unsorted array representation of the union of the two arrays arr1 and arr2 
// with each element included exactly once, regardless of the count in arr1 and arr2
noam.util.setUnion = function(arr1, arr2) {
  var res = [];
  var i;
  for (i=0; i<arr1.length; i++) {
    // this will not include duplicates from arr1
    if (!noam.util.contains(res, arr1[i])) { 
      res.push(arr1[i]);
    }
  }
  for (i=0; i<arr2.length; i++) {
    if (!noam.util.contains(res, arr2[i])) { 
      res.push(arr2[i]);
    }
  }
  return res;
};

// make a deep clone of an object
noam.util.clone = function(obj) {
  return JSON.parse(JSON.stringify(obj));
};


// Returns an object that is basically an integer reference useful for counting
// across multiple function calls. The current value can be accessed through the
// value property.
// See the noam.re.tree.toAutomaton function for a usage example.
noam.util.makeCounter = (function() {
  function getAndAdvance() {
    return this.value++;
  }

  function makeCounter(init) {
    return {
      value: init,
      getAndAdvance: getAndAdvance,
    };
  };

  return makeCounter;
})();

// FSM creation API

// Creates and returns an empty FSM that can then be manipulated through the other 
// functions in the API.
noam.fsm.makeNew = function() {
  return {
    states: [],
    alphabet: [],
    acceptingStates: [],
    initialState: undefined,
    transitions: [],
  };
};

// Common internal implementation for addStata and addSymbol.
noam.fsm._addStateOrSymbol = function(arr, obj, undefErrorMsg, existsErrorMsg) {
  // need to check this because undefined would otherwise be added as a state
  // or symbol which is probably not what you want
  if (obj === undefined) { 
    throw new Error(undefErrorMsg);
  }
  if (noam.util.contains(arr, obj)) {
    throw new Error(existsErrorMsg);
  }

  arr.push(obj);
  return obj;
};

// Adds stateObj as a state to the fsm.
// Throws an Error if no stateObj is passed or if the same state already exists.
// Returns the added state object.
noam.fsm.addState = function(fsm, stateObj) {
  return noam.fsm._addStateOrSymbol(fsm.states, stateObj, 
      "No state object specified", "State already exists");
};

// Adds symObj as an alphabet symbol to the fsm.
// Throws an Error if no symObj is passed or if the same symbol already exists.
// Returns the added symbol object.
noam.fsm.addSymbol = function(fsm, symObj) {
  if (noam.util.areEquivalent(symObj, noam.fsm.epsilonSymbol)) {
    throw new Error("Can't add the epsilon symbol to the alphabet");
  }
  return noam.fsm._addStateOrSymbol(fsm.alphabet, symObj, 
      "No symbol object specified", "Symbol already exists");
};

// Makes stateObj an accepting state of the fsm.
// Throws an Error if stateObj is not a state of the fsm or if it is already
// accepting.
noam.fsm.addAcceptingState = function(fsm, stateObj) {
  if (!noam.util.contains(fsm.states, stateObj)) {
    throw new Error("The specified object is not a state of the FSM");
  }
  noam.fsm._addStateOrSymbol(fsm.acceptingStates, stateObj, "", 
      "The specified state is already accepting");
};

// Sets stateObj as the start state of the fsm.
// Throws an Error if stateObj is not a state of the fsm.
noam.fsm.setInitialState = function(fsm, stateObj) {
  if (!noam.util.contains(fsm.states, stateObj)) {
    throw new Error("The specified object is not a state of the FSM");
  }
  fsm.initialState = stateObj;
};

// Common implementation for addTransition and addEpsilonTransition.
noam.fsm._addTransition = function(fsm, fromState, toStates, transitionSymbol) {
  if (!Array.isArray(toStates)) {
    throw new Error("The toStates argument must be an array");
  }
  if (!noam.util.contains(fsm.states, fromState) || 
      !noam.util.containsAll(fsm.states, toStates)) {
    throw new Error("One of the specified objects is not a state of the FSM");
  }

  var i;
  var added = false;
  for (i=0; i<fsm.transitions.length; i++) {
    if (noam.util.areEquivalent(fromState, fsm.transitions[i].fromState) &&
        noam.util.areEquivalent(transitionSymbol, fsm.transitions[i].transitionSymbol)) {
      fsm.transitions[i].toStates = noam.util.setUnion(fsm.transitions[i].toStates, toStates);
      added = true;
      break;
    }
  }
  if (!added) {
    fsm.transitions.push({fromState: fromState, toStates: toStates, symbol: transitionSymbol});
  }
};

// Adds a transition from fromState to the set of states represented by the array
// toStates, using transitionSymbol.
// If a transition for this pair of (fromState, transitionSymbol) already exists,
// toStates is added to the existing set of destination states.
// Throws an Error if any of the states is not actually in the fsm or if the
// transition symbol is not in the fsm's alphabeth.
// Note that this means that an Error will be thrown if you try to use this to
// specify an epsilon transition. For that, use addEpsilonTransition instead.
noam.fsm.addTransition = function(fsm, fromState, toStates, transitionSymbol) {
  if (!noam.util.contains(fsm.alphabet, transitionSymbol)) {
    throw new Error("The specified object is not an alphabet symbol of the FSM");
  }
  noam.fsm._addTransition(fsm, fromState, toStates, transitionSymbol);
};

// Equivalent to addTransition except that there is no transition symbol, i.e. the
// transition can be executed without consuming an input symbol.
noam.fsm.addEpsilonTransition = function(fsm, fromState, toStates) {
  noam.fsm._addTransition(fsm, fromState, toStates, noam.fsm.epsilonSymbol);
};

// end of FSM creation API

// validates a FSM definition
noam.fsm.validate = function(fsm) {
  if (!(typeof fsm !== 'undefined' &&
      Array.isArray(fsm.states) &&
      Array.isArray(fsm.alphabet) &&
      Array.isArray(fsm.acceptingStates) &&
      typeof fsm.initialState !== 'undefined' && fsm.initialState !== null &&
      Array.isArray(fsm.transitions))) {
    return new Error('FSM must be defined and have states, alphabet, acceptingStates, initialState and transitions array properties!');
  }

  if (fsm.states.length < 1) {
    return new Error('Set of states must not be empty.');
  }

  for (var i=0; i<fsm.states.length; i++) {
    if (noam.util.contains(fsm.states, fsm.states[i], i+1)) {
      return new Error('Equivalent states');
    }
  }

  if (fsm.alphabet.length < 1) {
    return new Error('Alphabet must not be empty.');
  }

  for (var i=0; i<fsm.alphabet.length; i++) {
    if (noam.util.contains(fsm.alphabet, fsm.alphabet[i], i+1)) {
      return new Error('Equivalent alphabet symbols');
    }
  }

  if (noam.util.contains(fsm.alphabet, noam.fsm.epsilonSymbol)) {
    return new Error('FSM alphabet must not contain the epsilon symbol');
  }

  for (var i=0; i<fsm.alphabet.length; i++) {
    if (noam.util.contains(fsm.states, fsm.alphabet[i])) {
      return new Error('States and alphabet symbols must not overlap');
    }
  }

  for (var i=0; i<fsm.acceptingStates.length; i++) {
    if (noam.util.contains(fsm.acceptingStates, fsm.acceptingStates[i], i+1)) {
      return new Error('Equivalent acceptingStates');
    }

    if (!(noam.util.contains(fsm.states, fsm.acceptingStates[i]))) {
      return new Error('Each accepting state must be in states');
    }
  }

  if (!(noam.util.contains(fsm.states, fsm.initialState))) {
    return new Error('Initial state must be in states');
  }

  for (var i=0; i<fsm.transitions.length; i++) {
    var transition = fsm.transitions[i];

    if (typeof transition.fromState === 'undefined' ||
        typeof transition.toStates === 'undefined' ||
        typeof transition.symbol === 'undefined') {
      return new Error('Transitions must have fromState, toState and symbol');
    }

    if (!(noam.util.contains(fsm.states, transition.fromState))) {
      return new Error('Transition fromState must be in states.');
    }

    if (!(noam.util.contains(fsm.alphabet, transition.symbol)) && 
        transition.symbol !== noam.fsm.epsilonSymbol) {
      return new Error('Transition symbol must be in alphabet.');
    }

    for (var k=0; k<transition.toStates.length; k++) {
      if (!(noam.util.contains(fsm.states, transition.toStates[k]))) {
        return new Error('Transition toStates must be in states.');
      }

      if (noam.util.contains(transition.toStates, transition.toStates[k], k+1)) {
        return new Error('Transition toStates must not contain duplicates.');
      }
    }
  }

  for (var i=0; i<fsm.transitions.length; i++) {
    for (var j=i+1; j<fsm.transitions.length; j++) {
      if (fsm.transitions[i].fromState === fsm.transitions[j].fromState &&
          fsm.transitions[i].symbol === fsm.transitions[j].symbol) {
        return new Error('Transitions for the same fromState and symbol must be defined in a single trainsition.');
      }
    }
  }

  return true;
};

// determine if stateObj is an accepting state in fsm
noam.fsm.isAcceptingState = function(fsm, stateObj) {
  return noam.util.contains(fsm.acceptingStates, stateObj);
};

// determine fsm type based on transition function
noam.fsm.determineType = function(fsm) {
  var fsmType = noam.fsm.dfaType;

  for (var i=0; i<fsm.transitions.length; i++) {
    var transition = fsm.transitions[i];

    if (transition.toStates.length === 0 ||
        transition.toStates.length > 1) {
      fsmType = noam.fsm.nfaType;
    } else if (transition.symbol === noam.fsm.epsilonSymbol) {
      fsmType = noam.fsm.enfaType;
      break;
    }
  }

  if (fsmType === noam.fsm.dfaType) {
    if (fsm.transitions.length < fsm.states.length * fsm.alphabet.length) {
      fsmType = noam.fsm.nfaType;
    }
  }

  return fsmType;
};

// computes epsilon closure of fsm from states array states
noam.fsm.computeEpsilonClosure = function(fsm, states) {
  if (!(noam.util.containsAll(fsm.states, states))) {
    return new Error('FSM must contain all states for which epsilon closure is being computed');
  }

  var unprocessedStates = states
  var targetStates = [];

  while (unprocessedStates.length !== 0) {
    var currentState = unprocessedStates.pop();
    targetStates.push(currentState);

    for (var i=0; i<fsm.transitions.length; i++) {
      var transition = fsm.transitions[i];

      if (transition.symbol === noam.fsm.epsilonSymbol &&
          noam.util.areEquivalent(transition.fromState, currentState)) {
        for (var j=0; j<transition.toStates.length; j++) {
          if (noam.util.contains(targetStates, transition.toStates[j]) ||
              noam.util.contains(unprocessedStates, transition.toStates[j])) {
            continue;
          }

          unprocessedStates.push(transition.toStates[j]);
        }
      }
    }
  }

  return targetStates;
};

// determines the target states from reading symbol at states array states
noam.fsm.makeSimpleTransition = function(fsm, states, symbol) {
  if (!(noam.util.containsAll(fsm.states, states))) {
    return new Error('FSM must contain all states for which the transition is being computed');
  }

  if (!(noam.util.contains(fsm.alphabet, symbol))) {
    return new Error('FSM must contain input symbol for which the transition is being computed');
  }

  var targetStates = [];

  for (var i=0; i<fsm.transitions.length; i++) {
    var transition = fsm.transitions[i];

    if (noam.util.areEquivalent(fsm.transitions[i].symbol, symbol) &&
        noam.util.contains(states, transition.fromState)) {
      for (var j=0; j<transition.toStates.length; j++) {
        if (!(noam.util.contains(targetStates, transition.toStates[j]))) {
          targetStates.push(transition.toStates[j]);
        }
      }
    }
  }

  return targetStates;
};

// makes transition from states array states and for input symbol symbol by:
//   a) computing the epsilon closure of states
//   b) making a simple transition from resulting states of a)
//   c) computing the epsilon closure of resulting states of b)
noam.fsm.makeTransition = function(fsm, states, symbol) {
  if (!(noam.util.containsAll(fsm.states, states))) {
    return new Error('FSM must contain all states for which the transition is being computed');
  }

  if (!(noam.util.contains(fsm.alphabet, symbol))) {
    return new Error('FSM must contain input symbol for which the transition is being computed');
  }

  var targetStates = noam.util.clone(states);

  targetStates = noam.fsm.computeEpsilonClosure(fsm, targetStates);
  targetStates = noam.fsm.makeSimpleTransition(fsm, targetStates, symbol);
  targetStates = noam.fsm.computeEpsilonClosure(fsm, targetStates);

  return targetStates;
};

// read a stream of input symbols and determine target states
noam.fsm.readString = function(fsm, inputSymbolStream) {
  if (!(noam.util.containsAll(fsm.alphabet, inputSymbolStream))) {
    return new Error('FSM must contain all symbols for which the transition is being computed');
  }

  var states = noam.fsm.computeEpsilonClosure(fsm, [fsm.initialState]);

  for (var i=0; i<inputSymbolStream.length; i++) {
    states = noam.fsm.makeTransition(fsm, states, inputSymbolStream[i]);
  }

  return states;
};

// read a stream of input symbols starting from state and make a list of
// states that were on the transition path
noam.fsm.transitionTrail = function(fsm, state, inputSymbolStream) {
  if (!(noam.util.containsAll(fsm.alphabet, inputSymbolStream))) {
    return new Error('FSM must contain all symbols for which the transition is being computed');
  }

  var states = [state];
  var trail = [noam.util.clone(states)];

  for (var i=0; i<inputSymbolStream.length; i++) {
    states = noam.fsm.makeTransition(fsm, states, inputSymbolStream[i]);
    trail.push(noam.util.clone(states));
  }

  return trail;
};

// test if a stream of input symbols leads a fsm to an accepting state
noam.fsm.isStringInLanguage = function(fsm, inputSymbolStream) {
  var states = noam.fsm.readString(fsm, inputSymbolStream);

  return noam.util.containsAny(fsm.acceptingStates, states);
}

// pretty print the fsm transition function and accepting states as a table
noam.fsm.printTable = function(fsm) {
  var Table = require('/home/izuzak/cli-table');
  var colHeads = [""].concat(fsm.alphabet);

  if (noam.fsm.determineType(fsm) === noam.fsm.enfaType) {
    colHeads.push(noam.fsm.epsilonSymbol);
  }

  colHeads.push("");

  var table = new Table({
     head: colHeads,
     chars: {
       'top': '-',
       'top-mid': '+',
       'top-left': '+',
       'top-right': '+',
       'bottom': '-',
       'bottom-mid': '+',
       'bottom-left': '+',
       'bottom-right': '+',
       'left': '|',
       'left-mid': '+',
       'mid': '-',
       'mid-mid': '+',
       'right': '|',
       'right-mid': '+'
     },
     truncate: '…'
  });

  var tableRows = [];
  for (var i=0; i<fsm.states.length; i++) {
    tableRows.push(new Array(colHeads.length));
    for (var j=0; j<colHeads.length; j++) {
      tableRows[i][j] = "";
    }
    tableRows[i][0] = fsm.states[i].toString();
    tableRows[i][colHeads.length-1] =
      noam.util.contains(fsm.acceptingStates, fsm.states[i]) ?
      "1" : "0" ;
    table.push(tableRows[i]);
  }

  for (var i=0; i<fsm.transitions.length; i++) {
    var transition = fsm.transitions[i];

    var colNum = null;
    var rowNum = null;

    for (var j=0; j<fsm.states.length; j++) {
      if (noam.util.areEquivalent(fsm.states[j], transition.fromState)) {
        rowNum = j;
        break;
      }
    }

    if (transition.symbol === noam.fsm.epsilonSymbol) {
      colNum = colHeads.length-2;
    } else {
      for (var j=0; j<fsm.alphabet.length; j++) {
        if (noam.util.areEquivalent(fsm.alphabet[j], transition.symbol)) {
          colNum = j+1;
          break;
        }
      }
    }

    if (typeof tableRows[rowNum][colNum].text === "undefined") {
      tableRows[rowNum][colNum] = { text : [] };
    }

    tableRows[rowNum][colNum].text.push(transition.toStates);
  }

  return table.toString();
};

// print the fsm transition function and accepting states as an HTML table
noam.fsm.printHtmlTable = function(fsm) {
  var headers = [""].concat(fsm.alphabet);
  if (noam.fsm.determineType(fsm) === noam.fsm.enfaType) {
    headers.push(noam.fsm.epsilonSymbol);
  }
  headers.push("");

  var tableRows = [];
  
  for (var i=0; i<fsm.states.length; i++) {
    tableRows.push(new Array(headers.length));
    for (var j=0; j<headers.length; j++) {
      tableRows[i][j] = { text : []};
    }
    tableRows[i][0] = { text : fsm.states[i].toString() };
    tableRows[i][headers.length-1] =
      noam.util.contains(fsm.acceptingStates, fsm.states[i]) ?
      { text : ["1"] } : { text : ["0"] };
  }

  for (var i=0; i<fsm.transitions.length; i++) {
    var transition = fsm.transitions[i];

    var colNum = null;
    var rowNum = null;

    for (var j=0; j<fsm.states.length; j++) {
      if (noam.util.areEquivalent(fsm.states[j], transition.fromState)) {
        rowNum = j;
        break;
      }
    }

    if (transition.symbol === noam.fsm.epsilonSymbol) {
      colNum = headers.length-2;
    } else {
      for (var j=0; j<fsm.alphabet.length; j++) {
        if (noam.util.areEquivalent(fsm.alphabet[j], transition.symbol)) {
          colNum = j+1;
          break;
        }
      }
    }

    if (typeof tableRows[rowNum][colNum].text === "undefined") {
      tableRows[rowNum][colNum] = { text : [] };
    }

    tableRows[rowNum][colNum].text.push(transition.toStates);
  }

  var htmlString = [];

  htmlString.push("<table border='1'>");
  htmlString.push("  <tr>");
  
  for(var i=0; i<headers.length; i++) {
    htmlString.push("    <th>" + headers[i].toString() + "</th>");
  }

  htmlString.push("  </tr>");

  for (var i=0; i<tableRows.length; i++) {
    htmlString.push("  <tr>");
    for (var j=0; j<tableRows[i].length; j++) {
      htmlString.push("    <td>" + tableRows[i][j].text + "</td>");
    }

    htmlString.push("  </tr>");
  }

  htmlString.push("</table>");
  return htmlString.join("\n");
};

// print the fsm in the graphviz dot format
noam.fsm.printDotFormat = function(fsm) {
  var result = ["digraph finite_state_machine {", "  rankdir=LR;"];

  var accStates = ["  node [shape = doublecircle];"];
  
  for (var i=0; i<fsm.acceptingStates.length; i++) {
    accStates.push(fsm.acceptingStates[i].toString());
  }

  accStates.push(";");
  result.push(accStates.join(" "));
  result.push("  node [shape = circle];");
  result.push("  secret_node [style=invis, shape=point];");
  //var initState = ['  {rank = source; "'];
  //initState.push(fsm.initialState.toString());
  //initState.push('" "secret_node"}');
  //result.push(initState.join(""));

  var initStateArrow = ["  secret_node ->"]
  initStateArrow.push(fsm.initialState.toString());
  initStateArrow.push("[style=bold];");
  result.push(initStateArrow.join(" "));

  var newTransitions = [];

  for (var i=0; i<fsm.transitions.length; i++) {
    for (var j=0; j<fsm.transitions[i].toStates.length; j++) {
      var found = null;

      for (var k=0; k<newTransitions.length; k++) {
        if (noam.util.areEquivalent(newTransitions[k].fromState, fsm.transitions[i].fromState) &&
            noam.util.areEquivalent(newTransitions[k].toStates, [fsm.transitions[i].toStates[j]])) {
          found = newTransitions[k];
        }
      }

      if (found === null) {
        var newTransition = noam.util.clone(fsm.transitions[i]);
        newTransition.symbol = [newTransition.symbol];
        newTransitions.push(newTransition);
      } else {
        found.symbol.push(fsm.transitions[i].symbol);
      }
    }
  }

  for (var i=0; i<newTransitions.length; i++) {
    if (noam.util.areEquivalent(newTransitions[i].toStates[0], fsm.initialState)) {
      var trans = [" "];
      trans.push(newTransitions[i].toStates[0].toString());
      trans.push("->");
      trans.push(newTransitions[i].fromState.toString());
      trans.push("[");
      trans.push("label =");
      trans.push('"' + newTransitions[i].symbol.toString() + '"');
      trans.push(" dir = back];");
      result.push(trans.join(" "));
    } else {
      var trans = [" "];
      trans.push(newTransitions[i].fromState.toString());
      trans.push("->");
      trans.push(newTransitions[i].toStates[0].toString());
      trans.push("[");
      trans.push("label =");
      trans.push('"' + newTransitions[i].symbol.toString() + '"');
      trans.push(" ];");
      result.push(trans.join(" "));
    }
  }

  result.push("}");

  return result.join("\n").replace(/\$/g, "ε");
};

// determine reachable states
noam.fsm.getReachableStates = function(fsm, state, shouldIncludeInitialState) {
  var unprocessedStates = [state];
  var reachableStates = shouldIncludeInitialState ? [state] : [];

  while (unprocessedStates.length !== 0) {
    var currentState = unprocessedStates.pop();

    for (var i=0; i<fsm.transitions.length; i++) {
      var transition = fsm.transitions[i];

      if (noam.util.areEquivalent(currentState, transition.fromState)) {
        for (var j=0; j<transition.toStates.length; j++) {
          if (!(noam.util.contains(reachableStates, transition.toStates[j]))) {
            reachableStates.push(transition.toStates[j]);
            
            if (!(noam.util.contains(unprocessedStates, transition.toStates[j]))) {
              unprocessedStates.push(transition.toStates[j]);
            }
          }
        }
      }
    }
  }

 return reachableStates;
};

// determine and remove unreachable states
noam.fsm.removeUnreachableStates = function (fsm) {
  var reachableStates = noam.fsm.getReachableStates(fsm, fsm.initialState, true);
  var newFsm = noam.util.clone(fsm);
  newFsm.states = [];
  newFsm.acceptingStates = [];
  newFsm.transitions = [];

  for (var i=0; i<fsm.states.length; i++) {
    if(noam.util.contains(reachableStates, fsm.states[i])) {
      newFsm.states.push(noam.util.clone(fsm.states[i]));
    }
  }

  for (var i=0; i<fsm.acceptingStates.length; i++) {
    if (noam.util.contains(reachableStates, fsm.acceptingStates[i])) {
      newFsm.acceptingStates.push(noam.util.clone(fsm.acceptingStates[i]));
    }
  }

  for (var i=0; i<fsm.transitions.length; i++) {
    if (noam.util.contains(reachableStates, fsm.transitions[i].fromState)) {
      newFsm.transitions.push(noam.util.clone(fsm.transitions[i]));
    }
  }

  return newFsm;
};

// determines if two states from potentially different fsms are equivalent
noam.fsm.areEquivalentStates = function(fsmA, stateA, fsmB, stateB) {
  if (noam.fsm.determineType(fsmA) !== noam.fsm.dfaType ||
      noam.fsm.determineType(fsmB) !== noam.fsm.dfaType) {
    return new Error('FSMs must be DFAs');
  }

  if (fsmA.alphabet.length !== fsmB.alphabet.length ||
      !(noam.util.containsAll(fsmA.alphabet, fsmB.alphabet))) {
    return new Error('FSM alphabets must be the same');
  }

  if (!(noam.util.contains(fsmA.states, stateA)) ||
      !(noam.util.contains(fsmB.states, stateB))) {
    return new Error('FSMs must contain states');
  }

  function doBothStatesHaveSameAcceptance(fsmX, stateX, fsmY, stateY) {
    var stateXAccepting = noam.util.contains(fsmX.acceptingStates, stateX);
    var stateYAccepting = noam.util.contains(fsmY.acceptingStates, stateY);

    return (stateXAccepting && stateYAccepting) ||
           (!(stateXAccepting) && !(stateYAccepting));
  }

  var unprocessedPairs = [[stateA, stateB]];
  var processedPairs = [];

  while (unprocessedPairs.length !== 0) {
    var currentPair = unprocessedPairs.pop();

    for (var i=0; i<fsmA.alphabet.length; i++) {
      if (!(doBothStatesHaveSameAcceptance(fsmA, currentPair[0], fsmB, currentPair[1]))) {
        return false;
      }

      processedPairs.push(currentPair);

      for (var j=0; j<fsmA.alphabet.length; j++) {
        var pair = [noam.fsm.makeTransition(fsmA, [currentPair[0]], fsmA.alphabet[j])[0],
                    noam.fsm.makeTransition(fsmB, [currentPair[1]], fsmA.alphabet[j])[0]];

        if (!(noam.util.contains(processedPairs, pair)) &&
            !(noam.util.contains(unprocessedPairs, pair))) {
          unprocessedPairs.push(pair);
        }
      }
    }
  }

  return true;
};

// determines if two fsms are equivalent by testing equivalence of starting states
noam.fsm.areEquivalentFSMs = function(fsmA, fsmB) {
  return noam.fsm.areEquivalentStates(fsmA, fsmA.initialState, fsmB, fsmB.initialState);
};

// finds and removes equivalent states
noam.fsm.removeEquivalentStates = function(fsm) {
  if (noam.fsm.determineType(fsm) !== noam.fsm.dfaType) {
    return new Error('FSM must be DFA');
  }

  var equivalentPairs = [];

  for (var i=0; i<fsm.states.length; i++) {
    for (var j=i+1; j<fsm.states.length; j++) {
      if (noam.fsm.areEquivalentStates(fsm, fsm.states[i], fsm, fsm.states[j])) {
        var pair = [fsm.states[i], fsm.states[j]];

        for (var k=0; k<equivalentPairs.length; k++) {
          if (noam.util.areEquivalent(equivalentPairs[k][1], pair[0])) {
            pair[0] = equivalentPairs[k][1];
            break;
          }
        }

        if (!(noam.util.contains(equivalentPairs, pair))) {
          equivalentPairs.push(pair);
        }
      }
    }
  }

  var newFsm = {
    states : [],
    alphabet : noam.util.clone(fsm.alphabet),
    initialState : [],
    acceptingStates : [],
    transitions : []
  };

  function isOneOfEquivalentStates(s) {
    for (var i=0; i<equivalentPairs.length; i++) {
      if (noam.util.areEquivalent(equivalentPairs[i][1], s)) {
        return true;
      }
    }

    return false;
  }

  function getEquivalentState(s) {
    for (var i=0; i<equivalentPairs.length; i++) {
      if (noam.util.areEquivalent(equivalentPairs[i][1], s)) {
        return equivalentPairs[i][0];
      }
    }

    return s;
  }

  for (var i=0; i<fsm.states.length; i++) {
    if (!(isOneOfEquivalentStates(fsm.states[i]))) {
      newFsm.states.push(noam.util.clone(fsm.states[i]));
    }
  }

  for (var i=0; i<fsm.acceptingStates.length; i++) {
    if (!(isOneOfEquivalentStates(fsm.acceptingStates[i]))) {
      newFsm.acceptingStates.push(noam.util.clone(fsm.acceptingStates[i]));
    }
  }

  newFsm.initialState = noam.util.clone(getEquivalentState(fsm.initialState));

  for (var i=0; i<fsm.transitions.length; i++) {
    var transition = noam.util.clone(fsm.transitions[i]);

    if (isOneOfEquivalentStates(transition.fromState)) {
      continue;
    }

    for (var j=0; j<transition.toStates.length; j++) {
      transition.toStates[j] = getEquivalentState(transition.toStates[j]);
    }

    newFsm.transitions.push(transition);
  }

  return newFsm;
};

// minimizes the fsm by removing unreachable and equivalent states
noam.fsm.minimize = function(fsm) {
  var fsmType = noam.fsm.determineType(fsm);
  var newFsm = fsm;

  if (fsmType === noam.fsm.nfaType) {
    newFsm = noam.fsm.convertNfaToDfa(fsm);
  } else if (fsmType === noam.fsm.enfaType) {
    newFsm = noam.fsm.convertEnfaToNfa(fsm);
    newFsm = noam.fsm.convertNfaToDfa(newFsm);
  }

  var fsmWithoutUnreachableStates = noam.fsm.removeUnreachableStates(newFsm);
  var minimalFsm = noam.fsm.removeEquivalentStates(fsmWithoutUnreachableStates);
  return minimalFsm;
};

// generate random fsm
noam.fsm.createRandomFsm = function(fsmType, numStates, numAlphabet, maxNumToStates) {
  var newFsm = {};

  function prefix(ch, num, str) {
    var retStr = str;

    for (var i=0; i<str.length - num; i++) {
      retStr = ch + str;
    }

    return retStr;
  }

  newFsm.states = [];
  for (var i=0, len=numStates.toString().length; i<numStates; i++) {
    newFsm.states.push("s" + prefix("0", len, i.toString()));
  }

  newFsm.alphabet = [];
  for (var i=0, len=numAlphabet.toString().length; i<numAlphabet; i++) {
    newFsm.alphabet.push("a" + prefix("0", len, i.toString()));
  }

  newFsm.initialState = newFsm.states[0];

  newFsm.acceptingStates = [];
  for (var i=0; i<numStates; i++) {
    if(Math.round(Math.random())) {
      newFsm.acceptingStates.push(newFsm.states[i]);
    }
  }

  if (fsmType === noam.fsm.enfaType) {
    newFsm.alphabet.push(noam.fsm.epsilonSymbol);
  }

  newFsm.transitions = [];
  for (var i=0; i<numStates; i++) {
    for (var j=0; j<newFsm.alphabet.length; j++) {
      var numToStates = 1;

      if (fsmType !== noam.fsm.dfaType) {
        numToStates = Math.floor(Math.random()*maxNumToStates);
      }

      if (numToStates > 0) {
        var toStates = [];
        for (var k=0; k<newFsm.states.length && toStates.length < numToStates; k++) {
          var diff = (newFsm.states.length-k)-(numToStates-toStates.length) + 1;

          if (diff <= 0) {
            diff = 1;
          } else {
            diff = 1/diff;
          }

          if (Math.random() <= diff) {
            toStates.push(newFsm.states[k]);
          }
        }

        newFsm.transitions.push({fromState : newFsm.states[i], symbol : newFsm.alphabet[j], toStates : toStates});
      }
    }
  }

  if (fsmType === noam.fsm.enfaType) {
    newFsm.alphabet.pop();
  }

  return newFsm;
};

noam.fsm.convertNfaToDfa = function(fsm) {
  if (noam.fsm.determineType(fsm) !== noam.fsm.nfaType) {
    return new Error('FSM must be NFA');
  }

  var newFsm = {};

  newFsm.alphabet = noam.util.clone(fsm.alphabet);
  newFsm.states = [];
  newFsm.acceptingStates = [];
  newFsm.initialState = [noam.util.clone(fsm.initialState)];
  newFsm.transitions = [];

  for (var i=0; i<fsm.states.length; i++) {
    newFsm.states.push([noam.util.clone(fsm.states[i])]);
  }

  for (var i=0; i<fsm.acceptingStates.length; i++) {
    newFsm.acceptingStates.push([noam.util.clone(fsm.acceptingStates[i])]);
  }

  var newStates = [];
  var multiStates = [];

  for (var i=0; i<fsm.transitions.length; i++) {
    var transition = noam.util.clone(fsm.transitions[i]);
    transition.fromState = [transition.fromState];

    transition.toStates = [transition.toStates];

    if (transition.toStates[0].length > 1) {
      if (!(noam.util.containsSet(newStates, transition.toStates[0]))) {
        newStates.push(transition.toStates[0]);
      }
    }

    newFsm.transitions.push(transition);
  }

  while (newStates.length !== 0) {
    var state = newStates.pop();

    newFsm.states.push(state);

    if (noam.util.containsAny(fsm.acceptingStates, state)) {
      newFsm.acceptingStates.push(state);
    }

    for (var i=0; i<newFsm.alphabet.length; i++) {
      var ts = noam.fsm.makeTransition(fsm, state, newFsm.alphabet[i]).sort();

      for (var j=0; j<newFsm.states.length; j++) {
        if (noam.util.areEqualSets(ts, newFsm.states[j])) {
          ts = newFsm.states[j];
          break;
        }
      }
      
      for (var j=0; j<newStates.length; j++) {
        if (noam.util.areEqualSets(ts, newStates[j])) {
          ts = newStates[j];
          break;
        }
      }

      if (ts.length > 0) {
        newFsm.transitions.push({fromState : state, symbol : newFsm.alphabet[i], toStates : [ts]});
      }

      if (!(noam.util.containsSet(newFsm.states, ts)) && !(noam.util.containsSet(newStates, ts)) && ts.length > 1) {
        newStates.push(ts);
      }
    }
  }

  var errorAdded = false;
  var errorState = "ERROR";

  for (var i=0; i<newFsm.states.length; i++) {
    for (var j=0; j<newFsm.alphabet.length; j++) {
      var found = false;
      for (var k=0; k<newFsm.transitions.length; k++) {
        var transition = newFsm.transitions[k];

        if (noam.util.areEquivalent(transition.symbol, newFsm.alphabet[j]) &&
            noam.util.areEquivalent(transition.fromState, newFsm.states[i])) {
          found = true;
          break;
        }
      }

      if (found === false) {
        if (errorAdded === false) {
          newFsm.states.push([errorState]);
          errorAdded = true;
        }

        newFsm.transitions.push({fromState : newFsm.states[i], symbol : newFsm.alphabet[j], toStates : [[errorState]]});
      }
    }
  }

  return newFsm;
};

noam.fsm.convertEnfaToNfa = function(fsm) {
  if (noam.fsm.determineType(fsm) !== noam.fsm.enfaType) {
    return new Error('FSM must be eNFA');
  }

  var newFsm = noam.util.clone(fsm);

  var initialEpsilon = noam.fsm.computeEpsilonClosure(fsm, [fsm.initialState]);

  if (noam.util.containsAny(newFsm.acceptingStates, initialEpsilon) &&
      !(noam.util.contains(newFsm.acceptingStates, newFsm.initialState))) {
    newFsm.acceptingStates.push(newFsm.initialState);
  }

  var newTransitions = [];

  for (var i=0; i<newFsm.states.length; i++) {
    for (var j=0; j<newFsm.alphabet.length; j++) {
      var toStates = noam.fsm.makeTransition(newFsm, [newFsm.states[i]], newFsm.alphabet[j]).sort();

      if (toStates.length > 0) {
        newTransitions.push({
          fromState : newFsm.states[i],
          toStates : toStates,
          symbol : newFsm.alphabet[j]
        });
      }
    }
  }

  newFsm.transitions = newTransitions;

  var multiStateTransitions = [];

  for (var i=0; i<newFsm.transitions.length; i++) {
    var transition = newFsm.transitions[i];

    if (transition.toStates.length > 1) {
      var existing = false;

      for (var j=0; j<multiStateTransitions.length; j++) {
        if (noam.util.areEqualSets(transition.toStates, multiStateTransitions[j])) {
          transition.toStates = multiStateTransitions[j];
          existing = true;
          break;
        }
      }

      if (existing === false) {
        multiStateTransitions.push(transition.toStates);
      }
    }
  }

  return newFsm;
};

// test whether if the language accepted by the fsm contains at least one string
noam.fsm.isLanguageNonEmpty = function(fsm) {
  var fsmType = noam.fsm.determineType(fsm);
  var newFsm = fsm;

  if (fsmType === noam.fsm.nfaType) {
    newFsm = noam.fsm.convertNfaToDfa(fsm);
  } else if (fsmType === noam.fsm.enfaType) {
    newFsm = noam.fsm.convertEnfaToNfa(fsm);
    newFsm = noam.fsm.convertNfaToDfa(newFsm);
  }

  newFsm = noam.fsm.minimize(newFsm);

  return newFsm.acceptingStates.length > 0;
};

noam.fsm.isLanguageInfinite = function(fsm) {
  var fsmType = noam.fsm.determineType(fsm);
  var newFsm = fsm;

  if (fsmType === noam.fsm.nfaType) {
    newFsm = noam.fsm.convertNfaToDfa(fsm);
  } else if (fsmType === noam.fsm.enfaType) {
    newFsm = noam.fsm.convertEnfaToNfa(fsm);
    newFsm = noam.fsm.convertNfaToDfa(newFsm);
  }

  newFsm = noam.fsm.minimize(newFsm);

  var deadState = null;

  for (var i=0; i<newFsm.states.length; i++) {
    if (noam.util.contains(newFsm.acceptingStates, newFsm.states[i])) {
      continue;
    }

    var reachable = noam.fsm.getReachableStates(newFsm, newFsm.states[i], true);

    if (noam.util.containsAny(newFsm.acceptingStates, reachable)) {
      continue;
    }

    deadState = newFsm.states[i];
    break;
  }

  if (deadState === null) {
    return true;
  }

  for (var i=0; i<newFsm.states.length; i++) {
    if (noam.util.areEquivalent(deadState, newFsm.states[i])) {
      continue;
    }

    var reachable = noam.fsm.getReachableStates(newFsm, newFsm.states[i], false);

    if (noam.util.contains(reachable, newFsm.states[i])) {
      return true;
    }
  }

  return false;
};

// generate a random string which the fsm accepts
noam.fsm.randomStringInLanguage = function(fsm) {
  var fsmType = noam.fsm.determineType(fsm);
  var newFsm = fsm;

  if (fsmType === noam.fsm.nfaType) {
    newFsm = noam.fsm.convertNfaToDfa(fsm);
  } else if (fsmType === noam.fsm.enfaType) {
    newFsm = noam.fsm.convertEnfaToNfa(fsm);
    newFsm = noam.fsm.convertNfaToDfa(newFsm);
  }

  newFsm = noam.fsm.minimize(newFsm);

  if (newFsm.acceptingStates.length === 0) {
    return null;
  }

  var currentState = newFsm.acceptingStates[Math.floor(Math.random()*newFsm.acceptingStates.length)];
  var trail = [];

  while (true) {
    if (noam.util.areEquivalent(currentState, newFsm.initialState) === true) {
      if (Math.round(Math.random())) {
        break;
      }
    }

    var transitions = [];

    for (var i=0; i<newFsm.transitions.length; i++) {
      if (noam.util.areEquivalent(newFsm.transitions[i].toStates[0], currentState)) {
        transitions.push(newFsm.transitions[i]);
      }
    }

    if (transitions.length === 0) {
      break;
    }

    var transition = transitions[Math.floor(Math.random()*transitions.length)];

    trail.push(transition.symbol);
    currentState = transition.fromState;
  }

  trail.reverse();

  return trail;
};

// generate a random string which the fsm doest accept
noam.fsm.randomStringNotInLanguage = function(fsm) {
  var fsmType = noam.fsm.determineType(fsm);
  var newFsm = fsm;

  if (fsmType === noam.fsm.nfaType) {
    newFsm = noam.fsm.convertNfaToDfa(fsm);
  } else if (fsmType === noam.fsm.enfaType) {
    newFsm = noam.fsm.convertEnfaToNfa(fsm);
    newFsm = noam.fsm.convertNfaToDfa(newFsm);
  }

  newFsm = noam.fsm.minimize(newFsm);

  var nonAcceptingStates = [];

  for (var i=0; i<newFsm.states.length; i++) {
    if (!(noam.util.contains(newFsm.acceptingStates, newFsm.states[i]))) {
      nonAcceptingStates.push(newFsm.states[i]);
    }
  }

  if (nonAcceptingStates.length === 0) {
    return null;
  }

  var currentState = nonAcceptingStates[Math.floor(Math.random()*nonAcceptingStates.length)];
  var trail = [];

  while (true) {
    if (noam.util.areEquivalent(currentState, newFsm.initialState) === true) {
      if (Math.round(Math.random())) {
        break;
      }
    }

    var transitions = [];

    for (var i=0; i<newFsm.transitions.length; i++) {
      if (noam.util.areEquivalent(newFsm.transitions[i].toStates[0], currentState)) {
        transitions.push(newFsm.transitions[i]);
      }
    }

    if (transitions.length === 0) {
      break;
    }

    var transition = transitions[Math.floor(Math.random()*transitions.length)];

    trail.push(transition.symbol);
    currentState = transition.fromState;
  }

  trail.reverse();

  return trail;
};

// get a new fsm which accepts the language L=L1+L2 (set union) where
// L1 is the language accepted by fsma and
// L2 is the language accepted by fsmB
noam.fsm.union = function(fsmA, fsmB) {
  if (!(noam.util.areEquivalent(fsmA.alphabet, fsmB.alphabet))) {
    throw new Error("Alphabets must be the same");
  }

  var newFsm = {
    alphabet : noam.util.clone(fsmA.alphabet),
    states : [],
    initialState : [noam.util.clone(fsmA.initialState), noam.util.clone(fsmB.initialState)],
    acceptingStates : [],
    transitions : []
  };

  for (var i=0; i<fsmA.states.length; i++) {
    for (var j=0; j<fsmB.states.length; j++) {
      var newState = [noam.util.clone(fsmA.states[i]), noam.util.clone(fsmB.states[j])];
      newFsm.states.push(newState);

      if (noam.util.contains(fsmA.acceptingStates, fsmA.states[i]) ||
          noam.util.contains(fsmB.acceptingStates, fsmB.states[j])) {
        newFsm.acceptingStates.push(newState);
      }

      for (var k=0; k<newFsm.alphabet.length; k++) {
        newFsm.transitions.push({
          fromState : newState,
          symbol : newFsm.alphabet[k],
          toStates : [[noam.fsm.makeTransition(fsmA, [fsmA.states[i]], newFsm.alphabet[k])[0],
                      noam.fsm.makeTransition(fsmB, [fsmB.states[j]], newFsm.alphabet[k])[0]]]
        });
      }
    }
  }

  return newFsm;
};

// get a new fsm which accepts the language L=L1/L2 (set intersection) where
// L1 is the language accepted by fsma and
// L2 is the language accepted by fsmB
noam.fsm.intersection = function(fsmA, fsmB) {
  if (!(noam.util.areEquivalent(fsmA.alphabet, fsmB.alphabet))) {
    throw new Error("Alphabets must be the same");
  }

  var newFsm = {
    alphabet : noam.util.clone(fsmA.alphabet),
    states : [],
    initialState : [noam.util.clone(fsmA.initialState), noam.util.clone(fsmB.initialState)],
    acceptingStates : [],
    transitions : []
  };

  for (var i=0; i<fsmA.states.length; i++) {
    for (var j=0; j<fsmB.states.length; j++) {
      var newState = [noam.util.clone(fsmA.states[i]), noam.util.clone(fsmB.states[j])];
      newFsm.states.push(newState);

      if (noam.util.contains(fsmA.acceptingStates, fsmA.states[i]) &&
          noam.util.contains(fsmB.acceptingStates, fsmB.states[j])) {
        newFsm.acceptingStates.push(newState);
      }

      for (var k=0; k<newFsm.alphabet.length; k++) {
        newFsm.transitions.push({
          fromState : newState,
          symbol : newFsm.alphabet[k],
          toStates : [[noam.fsm.makeTransition(fsmA, [fsmA.states[i]], newFsm.alphabet[k])[0],
                      noam.fsm.makeTransition(fsmB, [fsmB.states[j]], newFsm.alphabet[k])[0]]]
        });
      }
    }
  }

  return newFsm;
};

// get a new fsm which accepts the language L=L1-L2 (set difference) where
// L1 is the language accepted by fsma and
// L2 is the language accepted by fsmB
noam.fsm.difference = function(fsmA, fsmB) {
  if (!(noam.util.areEquivalent(fsmA.alphabet, fsmB.alphabet))) {
    throw new Error("Alphabets must be the same");
  }

  var newFsm = {
    alphabet : noam.util.clone(fsmA.alphabet),
    states : [],
    initialState : [noam.util.clone(fsmA.initialState), noam.util.clone(fsmB.initialState)],
    acceptingStates : [],
    transitions : []
  };

  for (var i=0; i<fsmA.states.length; i++) {
    for (var j=0; j<fsmB.states.length; j++) {
      var newState = [noam.util.clone(fsmA.states[i]), noam.util.clone(fsmB.states[j])];
      newFsm.states.push(newState);

      if (noam.util.contains(fsmA.acceptingStates, fsmA.states[i]) &&
          !(noam.util.contains(fsmB.acceptingStates, fsmB.states[j]))) {
        newFsm.acceptingStates.push(newState);
      }

      for (var k=0; k<newFsm.alphabet.length; k++) {
        newFsm.transitions.push({
          fromState : newState,
          symbol : newFsm.alphabet[k],
          toStates : [[noam.fsm.makeTransition(fsmA, [fsmA.states[i]], newFsm.alphabet[k])[0],
                      noam.fsm.makeTransition(fsmB, [fsmB.states[j]], newFsm.alphabet[k])[0]]]
        });
      }
    }
  }

  return newFsm;
};

// get a new fsm which accepts the complement language of the 
// langauge accepted by the input fsm
noam.fsm.complement = function(fsm) {
  var newFsm = noam.util.clone(fsm);

  var newAccepting = [];

  for (var i=0; i<newFsm.states.length; i++) {
    if (!(noam.util.contains(newFsm.acceptingStates, newFsm.states[i]))) {
      newAccepting.push(newFsm.states[i]);
    }
  }

  newFsm.acceptingStates = newAccepting;

  return newFsm;
};

// get a new fsm which accepts the language L1L2 where
// L1 is the language accepted by fsmA and L2 is the
// langauge accepted by fsmB
noam.fsm.concatenation = function(fsmA, fsmB) {
  if (!(noam.util.areEquivalent(fsmA.alphabet, fsmB.alphabet))) {
    throw new Error("Alphabets must be the same");
  }

  if (noam.util.containsAny(fsmA.states, fsmB.states)) {
    throw new Error("States must not overlap");
  }

  var newFsm = {
    alphabet : noam.util.clone(fsmA.alphabet),
    states : noam.util.clone(fsmA.states).concat(noam.util.clone(fsmB.states)),
    initialState : noam.util.clone(fsmA.initialState),
    acceptingStates : noam.util.clone(fsmB.acceptingStates),
    transitions : noam.util.clone(fsmA.transitions).concat(noam.util.clone(fsmB.transitions))
  };

  for (var i=0; i<fsmA.acceptingStates.length; i++) {
    newFsm.transitions.push({
      fromState : noam.util.clone(fsmA.acceptingStates[i]),
      toStates : [noam.util.clone(fsmB.initialState)],
      symbol : noam.fsm.epsilonSymbol
    });
  }

  return newFsm;
};

// get a new fsm which accepts the language L*, where L is
// accepted by the input fsm and * is the kleene operator
noam.fsm.kleene = function(fsm) {
  var newFsm = noam.util.clone(fsm);

  var newInitial = "NEW_INITIAL";

  newFsm.states.push(newInitial);
  newFsm.transitions.push({
    fromState : newInitial,
    toStates : [newFsm.initialState],
    symbol : noam.fsm.epsilonSymbol
  });
  newFsm.initialState = newInitial;

  for (var i=0; i<newFsm.acceptingStates.length; i++) {
    newFsm.transitions.push({
      fromState : newFsm.acceptingStates[i],
      toStates : [newInitial],
      symbol : noam.fsm.epsilonSymbol
    });
  }

  return newFsm;
};

// get a new fsm which accepts the reverse language of the input fsm
noam.fsm.reverse = function(fsm) {
  var newFsm = noam.util.clone(fsm);

  var newTransitions = [];

  for (var i=0; i<newFsm.transitions.length; i++) {
    for (var j=0; j<newFsm.transitions[i].toStates.length; j++) {
      newTransitions.push({
        fromState : newFsm.transitions[i].toStates[j],
        toStates : [newFsm.transitions[i].fromState],
        symbol : newFsm.transitions[i].symbol
      });
    }
  }

  newFsm.transitions = newTransitions;

  var oldAcceptingStates = newFsm.acceptingStates;

  newFsm.acceptingStates = [newFsm.initialState];

  var newInitialState = "NEW_INITIAL";
  newFsm.states.push(newInitialState);
  newFsm.initialState = newInitialState;

  newFsm.transitions.push({
    fromState : newInitialState,
    toStates : oldAcceptingStates,
    symbol : noam.fsm.epsilonSymbol
  });

  return newFsm;
};

// check whether the language accepted by fsmB is a subset of 
// the language accepted by fsmA
noam.fsm.isSubset = function(fsmA, fsmB) {
  var fsmIntersection = noam.fsm.intersection(fsmA, fsmB);

  return noam.fsm.areEquivalentFSMs(fsmB, fsmIntersection);
};

// convert the fsm into a regular grammar
noam.fsm.grammar = function(fsm) {
  var grammar = {
    nonterminals : noam.util.clone(fsm.states),
    terminals : noam.util.clone(fsm.alphabet),
    initialNonterminal : noam.util.clone(fsm.initialState),
    productions : []
  };

  for (var i=0; i<fsm.transitions.length; i++) {
    if (fsm.transitions[i].symbol === noam.fsm.epsilonSymbol) {
      grammar.productions.push({
        left : [noam.util.clone(fsm.transitions[i].fromState)],
        right : noam.util.clone(fsm.transitions[i].toStates)
      });
    } else {
      grammar.productions.push({
        left : [noam.util.clone(fsm.transitions[i].fromState)],
        right : [noam.util.clone(fsm.transitions[i].symbol)].concat(
          noam.util.clone(fsm.transitions[i].toStates))
      });
    }
  }

  for (var i=0; i<fsm.acceptingStates.length; i++) {
    grammar.productions.push({
      left : [noam.util.clone(fsm.acceptingStates[i])],
      right : [noam.grammar.epsilonSymbol]
    });
  }

  return grammar;
};

noam.grammar = {};

noam.grammar.epsilonSymbol = '$';
noam.grammar.regType = 'regular';
noam.grammar.cfgType = 'context-free';
noam.grammar.csgType = 'context-sensitive';
noam.grammar.unrestrictedType = 'unrestricted';

// validate the grammar
noam.grammar.validate = function(grammar) {
  if (!(typeof grammar !== 'undefined' &&
      Array.isArray(grammar.nonterminals) &&
      Array.isArray(grammar.terminals) &&
      typeof grammar.initialNonterminal !== 'undefined' && grammar.initialNonterminal !== null &&
      Array.isArray(grammar.productions))) {
    return new Error('Grammar must be defined and have nonterminals, terminals, initialNonterminal and productions array properties!');
  }

  if (grammar.nonterminals.length < 1) {
    return new Error('Set of nonterminals must not be empty.');
  }

  if (grammar.terminals.length < 1) {
    return new Error('Set of terminals must not be empty.');
  }

  for (var i=0; i<grammar.nonterminals.length; i++) {
    if (noam.util.contains(grammar.nonterminals, grammar.nonterminals[i], i+1)) {
      return new Error('Equivalent nonterminals');
    }
  }

  for (var i=0; i<grammar.terminals.length; i++) {
    if (noam.util.contains(grammar.terminals, grammar.terminals[i], i+1)) {
      return new Error('Equivalent terminals');
    }
  }

  for (var i=0; i<grammar.terminals.length; i++) {
    if (noam.util.contains(grammar.nonterminals, grammar.terminals[i])) {
      return new Error('Terminals and nonterminals must not overlap');
    }
  }

  if (!(noam.util.contains(grammar.nonterminals, grammar.initialNonterminal))) {
    return new Error('InitialNonterminal must be in nonterminals');
  }

  for (var i=0; i<grammar.productions.length; i++) {
    var production = grammar.productions[i];

    if (!(Array.isArray(production.left))) {
      return new Error('Left side of production must be an array');
    }

    if (production.left.length === 0) {
      return new Error('Left side of production must have at least one terminal or nonterminal');
    }

    for (var j=0; j<production.left.length; j++) {
      if (!(noam.util.contains(grammar.nonterminals, production.left[j])) &&
          !(noam.util.contains(grammar.terminals, production.left[j]))) {
        return new Error('Left side of production must be in nonterminals or terminals');
      }
    }

    if (!(Array.isArray(production.right))) {
      return new Error('Right side of production must be an array');
    }

    if (production.right.length === 1 && production.right[0] === noam.grammar.epsilonSymbol) {
      ;
    } else {
      if (production.right.length === 0) {
        return new Error('Right side of production must have at least one terminal or nonterminal or epsilon symbol');
      }

      for (var j=0; j<production.right.length; j++) {
        if (!(noam.util.contains(grammar.nonterminals, production.right[j])) &&
            !(noam.util.contains(grammar.terminals, production.right[j]))) {
          return new Error('Right side of production must be in nonterminals or terminals');
        }
      }
    }

    if (noam.util.contains(grammar.productions, production, i+1)) {
      return new Error('Grammar must not have duplicate productions');
    }
  }

  return true;
};

// determine whether the grammar is regular, context-free, 
// context-sensitive or unrestricted
noam.grammar.determineType = function(grammar) {
  var type = noam.grammar.regType;
  var isRightRegular = null;

  for (var i=0; i<grammar.productions.length; i++) {
    var production = grammar.productions[i];

    // handle both left-regular and right-regular
    if (type === noam.grammar.regType) {
      if (production.left.length !== 1 || !(noam.util.contains(grammar.nonterminals, production.left[0]))) {
        type = noam.grammar.cfgType;
      } else {
        if (production.right.length === 1) {
          continue;
        } else {
          var rightNonTerminalCount = 0;
          var indexOfNonterminal = -1;

          for (var j=0; j<production.right.length; j++) {
            if (noam.util.contains(grammar.nonterminals, production.right[j])) {
              rightNonTerminalCount += 1;
              indexOfNonterminal = j;
            }
          }

          if (rightNonTerminalCount > 1) {
            type = noam.grammar.cfgType;
          } else if (rightNonTerminalCount === 0) {
            continue;
          } else {
            if (indexOfNonterminal === 0) {
              if (isRightRegular === null) {
                isRightRegular = false;
                continue;
              } else if (isRightRegular === false) {
                continue;
              } else if (isRightRegular === true) {
                type = noam.grammar.cfgType;
              }
            } else if (indexOfNonterminal === production.right.length - 1) {
              if (isRightRegular === null) {
                isRightRegular = true;
                continue;
              } else if (isRightRegular === true) {
                continue;
              } else if (isRightRegular === false) {
                type = noam.grammar.cfgType;
              }
            } else {
              type = noam.grammar.cfgType;
            }
          }
        }
      }
    }

    if (type === noam.grammar.cfgType) {
      if (production.left.length !== 1 || !(noam.util.contains(grammar.nonterminals, production.left[0]))) {
        type = noam.grammar.csgType;
      }
    }

    if (type === noam.grammar.csgType) {
      var leftNonTerminalCount = 0;
      var indexOfNonterminal = -1;

      for (var j=0; j<production.left.length; j++) {
        if (noam.util.contains(grammar.nonterminals, production.left[j])) {
          leftNonTerminalCount += 1;
          indexOfNonterminal = j;
        }
      }

      if (leftNonTerminalCount > 1) {
        return noam.grammar.unrestrictedType;
      }

      var prefix = production.left.slice(0, indexOfNonterminal-1);
      var sufix = production.left.slice(indexOfNonterminal);

      for (var j=0; j<prefix.length; j++) {
        if (!(noam.util.areEquivalent(prefix[j], production.right[j]))) {
          return noam.grammar.unrestrictedType;
        }
      }

      for (var j=0; j<sufix.length; j++) {
        if (!(noam.util.areEquivalent(sufix[sufix.length-j-1], production.right[production.right.length-j-1]))) {
          return noam.grammar.unrestrictedType;
        }
      }

      if (production.right.length <= prefix.length + sufix.length) {
        return noam.grammar.unrestrictedType;
      }
    }
  }

  return type;
};

// print the grammar in a human-readable condensed ascii format
noam.grammar.printAscii = function(grammar) {
  var str = [];

  str.push("Initial nonterminal: " + "<" + grammar.initialNonterminal + ">");

  var slimProds = [];

  for (var i=0; i<grammar.productions.length; i++) {
    var foundSlim = -1;

    for (var j=0; j<slimProds.length; j++) {
      if (noam.util.areEquivalent(slimProds[j][0], grammar.productions[i].left)) {
        foundSlim = j;
        break;
      }
    }

    if (foundSlim === -1) {
      slimProds[slimProds.length] = [grammar.productions[i].left, [grammar.productions[i].right]];
    } else {
      slimProds[foundSlim][1].push(grammar.productions[i].right);
    }
  }

  for (var i=0; i<slimProds.length; i++) {
    var prod = [];

    for (var j=0; j<slimProds[i][0].length; j++) {
      if (noam.util.contains(grammar.nonterminals, slimProds[i][0][j])) {
        prod.push("<" + slimProds[i][0][j].toString() + ">");
      } else {
        if (slimProds[i][0][j] === noam.grammar.epsilonSymbol) {
          prod.push(slimProds[i][0][j].toString());
        } else {
          prod.push('"' + slimProds[i][0][j].toString() + '"');
        }
      }
    }

    prod.push("->");

    for (var j=0; j<slimProds[i][1].length; j++) {
      for (var k=0; k<slimProds[i][1][j].length; k++) {
        if (noam.util.contains(grammar.nonterminals, slimProds[i][1][j][k])) {
          prod.push("<" + slimProds[i][1][j][k].toString() + ">");
        } else {
          if (slimProds[i][1][j][k] === noam.grammar.epsilonSymbol) {
            prod.push(slimProds[i][1][j][k].toString());
          } else {
            prod.push('"' + slimProds[i][1][j][k].toString() + '"');
          }
        }
      }

      if (j < slimProds[i][1].length - 1) {
        prod.push("|");
      }
    }

    str.push(prod.join(" "));
  }

  return str.join("\n");
};

/* 
 * Regular expressions module.
 *
 * Parsed regular expressions are represented by a syntax tree. Tools for working with that 
 * representation are accessible through noam.re.tree.
 */
noam.re = (function() {

  /*
   * Tools for creating and manipulating parsed regular expressions.
   *
   * The make* functions are a minimal API that can be used to create arbitrarily complex
   * regular expressions programatically.
   */
  var tree = (function() {
    var tags = {
      ALT: 'alt',
      SEQ: 'sequence',
      KSTAR: 'kleene_star',
      LIT: 'literal',
      EPS: 'epsilon',
    };

    // The choices parameter must be an array of expression trees.
    // Returns the root of a new tree that represents the expression that is the union of
    // all the choices.
    function makeAlt(choices) {
      return {
        tag: tags.ALT,
        choices: choices,
      };
    }

    // The elements parameter must be an array of expression trees.
    // Returns the root of a new tree that represents the expression that is the sequence
    // of all the elements.
    function makeSeq(elements) {
      return {
        tag: tags.SEQ,
        elements: elements,
      };
    }

    // Wraps the given expressin tree unde a Kleene star operator.
    // Returns the root of the new tree.
    function makeKStar(expr) {
      return {
        tag: tags.KSTAR,
        expr: expr,
      };
    }

    // Creates a node that represents the literal obj.
    function makeLit(obj) {
      return {
        tag: tags.LIT,
        obj: obj,
      };
    }

    var epsNode = {
      tag: tags.EPS,
    };
    // Returns a node representing the empty string regular expression.
    function makeEps() {
      return epsNode;
    }

    function _altToAutomaton(regex, automaton, stateCounter) {
      var l = noam.fsm.addState(automaton, stateCounter.getAndAdvance());
      var r = noam.fsm.addState(automaton, stateCounter.getAndAdvance());
      for (var i=0; i<regex.choices.length; i++) {
        var statePair = _dispatch(regex.choices[i], automaton, stateCounter);
        noam.fsm.addEpsilonTransition(automaton, l, [statePair[0]]);
        noam.fsm.addEpsilonTransition(automaton, statePair[1], [r]);
      }
      return [l, r];
    }

    function _seqToAutomaton(regex, automaton, stateCounter) {
      // Create the parts for the sequence elements and connect them via epsilon transitions.
      var l, r, statePair;
      for (var i=0; i<regex.elements.length; i++) {
        statePair = _dispatch(regex.elements[i], automaton, stateCounter);
        if (i === 0) { // this is the first element
          l = statePair[0];
        } else { // this is a later element that needs to be connected to the previous elements
          noam.fsm.addEpsilonTransition(automaton, r, [statePair[0]]);
        }
        r = statePair[1];
      }
      return [l, r];
    }

    function _KStarToAutomaton(regex, automaton, stateCounter) {
      // The $ sign in the following drawing represents an epsilon transition.
      //
      //    ----------------$>----------------
      //   /                                  \
      // |l|-$>-|ll|...(regex.expr)...|rr|-$>-|r|
      //          \_________<$_________/
      //
      var l = noam.fsm.addState(automaton, stateCounter.getAndAdvance());
      var r = noam.fsm.addState(automaton, stateCounter.getAndAdvance());
      var inner = _dispatch(regex.expr, automaton, stateCounter);
      var ll = inner[0];
      var rr = inner[1];
      noam.fsm.addEpsilonTransition(automaton, l, [r]); // zero times
      noam.fsm.addEpsilonTransition(automaton, l, [ll]); // once or more times
      noam.fsm.addEpsilonTransition(automaton, rr, [ll]); // repeat
      noam.fsm.addEpsilonTransition(automaton, rr, [r]); // continue after one or more repetitions

      return [l, r];
    }

    function _litToAutomaton(regex, automaton, stateCounter) {
      // Generate the "left" and "right" states and connect them with the appropriate
      // transition symbol.
      var l = noam.fsm.addState(automaton, stateCounter.getAndAdvance());
      var r = noam.fsm.addState(automaton, stateCounter.getAndAdvance());
      try {
        noam.fsm.addSymbol(automaton, regex.obj);
      } catch (err) {
        ; // addSymbol can throw if the symbol already exists - that's ok but
          // would like to be able to avoid catching other exceptions
          // TODO: use a custom exception class instead of Error
      }
      noam.fsm.addTransition(automaton, l, [r], regex.obj);
      return [l, r];
    }

    function _epsToAutomaton(regex, automaton, stateCounter) {
      // Generate the "left" and "right" states and connect them with an epsilon transition.
      var l = noam.fsm.addState(automaton, stateCounter.getAndAdvance());
      var r = noam.fsm.addState(automaton, stateCounter.getAndAdvance());
      noam.fsm.addEpsilonTransition(automaton, l, [r]);
      return [l, r];
    }

    var _toAutomatonFuns = {};
    _toAutomatonFuns[tags.ALT] = _altToAutomaton;
    _toAutomatonFuns[tags.SEQ] = _seqToAutomaton;
    _toAutomatonFuns[tags.KSTAR] = _KStarToAutomaton;
    _toAutomatonFuns[tags.LIT] = _litToAutomaton;
    _toAutomatonFuns[tags.EPS] = _epsToAutomaton;

    // Calls the appropriate *ToAutomaton function to handle the various kinds of regular expressions.
    // @a stateCounter holds the number of the next state to be added to the automaton.
    // Every *ToAutomaton function modifies @a automaton and returns a pair of states (as a two element array).
    // The first state is the start state and the second state is the accepting state of the part of the
    // automaton that accepts the language defined by @a regex.
    function _dispatch(regex, automaton, stateCounter) {
      return _toAutomatonFuns[regex.tag](regex, automaton, stateCounter);
    }

    // Returns the equivalent FSM for the specified regular expression in the tree representation.
    function toAutomaton(regex) {
      var automaton = noam.fsm.makeNew();
      var statePair = _dispatch(regex, automaton, noam.util.makeCounter(0));
      noam.fsm.setInitialState(automaton, statePair[0]);
      noam.fsm.addAcceptingState(automaton, statePair[1]);
      return automaton;
    }

    return {
      tags: tags,

      makeAlt: makeAlt,
      makeSeq: makeSeq,
      makeKStar: makeKStar,
      makeLit: makeLit,
      makeEps: makeEps,

      toAutomaton: toAutomaton,
    };
  })();

  return {
    tree: tree,
  };
})();
