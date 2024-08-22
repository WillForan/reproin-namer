export let entity_table;
//var RI_entity_order = ['ses','task','acq','run','dir']
export async function fetch_entity(){
    const bids_json_url = "./bids-table_ver-1.10.0dev.json";
    const resp = await fetch(bids_json_url)
    entity_table = await resp.json();
    fill_datatype()
    fill_suffix_opts()
}
function fill_datatype(){
    const sel = document.getElementById('datatype');
    sel.innerHTML = "<option value=''> </option>";
    for(const k in entity_table){
        sel.innerHTML += "<option value=" + k + ">" + k + "</option>";
    }
}

function fill_suffix_opts() {
  const cont = document.getElementById('cont-suffix-opts');
  let new_html = "";
  for (dt in entity_table) {
    // one GRE fmap sequence on the scanner can have multiple oupts with different suffixes
    // solution is to leave suffix unspecified for downstream software to figure out
    if (dt === "fmap") {
      entity_table[dt].unshift({
        value: "",
        display_name: "Multiple",
        description:  "Multiple output series from a single scan sequence. Suffix is left blank for downstream software to disambiguate with more information (e.g. multiple folders with distinguishing dicom headers)",

        // want generic entity options (ses, run, acq, chunk). same as mag or phase would have
        // fmap[0] is likely phasediff. has same options as phase and mag
        // copy phasediff b/c entities array has nested structure that includes tooltip popup text
        entities: entity_table['fmap'][0].entities
      });
    }

    for (i in entity_table[dt]) {
      s = entity_table[dt][i]; // Use index for value in label select.
      const lcname = s['value'].toLowerCase();
      const bids_link = `https://bids-specification.readthedocs.io/en/stable/glossary.html#${lcname}-suffixes`;
      // WIP: use #:~:text= fragment url to go to yaml definition
      //const bids_yaml = `https://github.com/bids-standard/bids-specification/blob/master/src/schema/objects/suffixes.yaml#:~:text=${s['value']}:,value:%20${lcname}`;
      // <a href="${bids_yaml}" class=bids-link targegt=_blank>[def]</a>



      const code_span = `<span class=entity-code>[${dt}/${s['value']}]</span>`;
      new_html += `<div class=entity-item><h3>${code_span} ${s['display_name']} <a href="${bids_link}" class=bids-link target=_blank>BIDS glossary</a></h3>`;
      new_html += `<p>${s['description']}</p>`;

      const entries = entity_table[dt][i]['entities'];
      const required = [];
      for (e in entries) {
        if (entries[e]['required'] == 'required' && e != 'subject') {
          required.push(entries[e]['display_name']);
        }
      }
      if (required.length > 0) {
        new_html += "<b>Additional entities required: " + required.join(", ") + "</b><br>";
      }
      new_html += `<a onclick="choose('${dt}', '${i}')" href="#">choose me!</a></div>`;
    }
    cont.innerHTML = new_html;
  }
}

function datatype_update_suffix(){
  const dt = document.getElementById('datatype');
  // clear even if empty -- any change is worth resetting things
  const sel = document.getElementById('suffix');
  sel.innerHTML = "<option value=''> </option>";

  if(dt.value == "") { return; }
  const dt_suffix = entity_table[dt.value];
  if(!dt_suffix) { return; }

  for(const i in dt_suffix){
      const e = dt_suffix[i]
      // replace single quote with html escape sequence
      const desc = e['description'].replace("'", "&#39;");
      sel.innerHTML += "<option value=" + i + " title='"+ desc + "'>" +
          e['display_name'] + " (" + e['value'] + ")</option>";
  }
  update_name()
}
function suffix_updated(){
  const suffix = document.getElementById('suffix');
  const ent_inputs = document.getElementById('entities-text')
  // clear on any change
  ent_inputs.innerHTML = ""
  if(suffix.value == "") {return;}

  // update description box
  const datatype = document.getElementById('datatype').value;
  const s = entity_table[datatype][suffix.value]
  document.getElementById('description').innerHTML = "<b>" + s['value'] + "</b>" + "(" + s['unit'] + ")<p>" + s["description"]

  // update generated name
  update_name()

  // add text boxes
  let i = 0;
  const n_on_line = 2;
  for(e_name in s["entities"]){
    const e = s["entities"][e_name]
    if(e['name'] == 'sub'){ continue; }
    if(e['name'] == 'acq'){ e['required'] = 'acq'; }
    const desc = e['description'].replace("'", "&#39;");
    const new_input = `<input id='entity-${e['name']}' name='${e['name']}' type=text placeholder='${e['display_name']}' class='${e['required']}' oninput='update_name()' title='${desc}'/>`;
    //console.log(new_input);
    ent_inputs.innerHTML += new_input;
    if(++i%n_on_line == 0){
        ent_inputs.innerHTML += "<br>";
    }
  }

  const cust_desc = 'After two underscores any arbitrary comment which will not matter to how layout in BIDS. But that one theoretically should not be necessary, and (ab)use of it would just signal lack of thought while preparing sequence name to start with since everything could have been expressed in BIDS fields.'
   ent_inputs.innerHTML += `<br><br><input style='width:100%' id='entity-__custom' name='__custom' type=text placeholder='custom' class='_custom' oninput='update_name()' title='${cust_desc}'/>`;
}
  
/**
 * update #reproin-name like seqtype_label_entity-value_entity-value
 * #entities-text>__custom is treated special
 * 
*/
function update_name(){
  const datatype = document.getElementById('datatype').value;
  const suffix_i = document.getElementById('suffix').value
  let suffix = "";
  if(datatype != "" && suffix_i != ""){
    suffix = entity_table[datatype][suffix_i]['value'];
  }
  let reproin_name = datatype + "-" + suffix;

  const inputs_div = document.getElementById('entities-text');
  for(e of inputs_div.children){
      if(e.value == "" || e.value === undefined) { continue;}
      //console.log(e.name,e.value)
     if( e.name === "__custom" ) {
      reproin_name += "__" + e.value;
     } else {
      reproin_name += "_" + e.name + "-" + e.value;
     }
  }
  document.getElementById('reproin-name').innerHTML = reproin_name;

}

function new_reproin_name(){
  const main = document.getElementById('reproin-name');
  if(main.innerHTML === " &nbsp; " ) {
     return;
  }
  const main_clone = main.cloneNode(true);
  main_clone.id = "reproin-name-x"; // TODO dynamically generate
   main_clone.innerHTML += `<button onclick='document.getElementById("${main_clone.id}").remove()'>x</a>`;
  main.parentElement.prepend(main_clone);
}
function reproin_name_clear(){
  document.getElementById('reproin-name').innerHTML = " &nbsp; ";
}
  
function choose(dt, i) {
  document.getElementById('datatype').value = dt;
  datatype_update_suffix();

  document.getElementById('suffix').value = i;
  suffix_updated();
}
