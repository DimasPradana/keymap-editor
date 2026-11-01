import '@fortawesome/fontawesome-free/css/all.css'
import keyBy from 'lodash/keyBy'
import { useMemo, useState } from 'react'

import * as config from './config'
import './App.css';
import { DefinitionsContext } from './providers'
import { loadKeycodes } from './keycodes'
import { loadBehaviours } from './api'
import KeyboardPicker from './Pickers/KeyboardPicker';
import Spinner from './Common/Spinner';
import Keyboard from './Keyboard/Keyboard'
import GitHubLink from './GitHubLink'
import Loader from './Common/Loader'
import github from './Pickers/Github/api'

const TABS = [
  { id: 'layers', label: 'LAYERS' },
  { id: 'conditional', label: 'CONDITIONAL LAYERS' },
  { id: 'combos', label: 'COMBOS' },
  { id: 'macros', label: 'MACROS' },
  { id: 'behaviors', label: 'BEHAVIORS' }
]

const EXTRA_FIELDS = {
  conditional: 'conditional_layers',
  combos: 'combos',
  macros: 'macros',
  behaviors: 'behaviors'
}

function App() {
  const [definitions, setDefinitions] = useState(null)
  const [source, setSource] = useState(null)
  const [sourceOther, setSourceOther] = useState(null)
  const [layout, setLayout] = useState(null)
  const [keymap, setKeymap] = useState(null)
  const [editingKeymap, setEditingKeymap] = useState(null)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('layers')

  const currentKeymap = editingKeymap || keymap

  function handleCompile() {
    fetch(`${config.apiBaseUrl}/keymap`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(editingKeymap || keymap)
    })
  }

  const handleCommitChanges = useMemo(() => function() {
    const { repository, branch } = sourceOther.github

    ;(async function () {
      setSaving(true)
      await github.commitChanges(repository, branch, layout, editingKeymap || keymap)
      setSaving(false)

      setKeymap(editingKeymap || keymap)
      setEditingKeymap(null)
    })()
  }, [
    layout,
    editingKeymap,
    keymap,
    sourceOther,
    setSaving,
    setKeymap,
    setEditingKeymap
  ])

  const handleKeyboardSelected = useMemo(() => function(event) {
    const { source, layout, keymap, ...other } = event

    setSource(source)
    setSourceOther(other)
    setLayout(layout)
    setKeymap(keymap)
    setEditingKeymap(null)
  }, [
    setSource,
    setSourceOther,
    setLayout,
    setKeymap,
    setEditingKeymap
  ])

  const initialize = useMemo(() => {
    return async function () {
      const [keycodes, behaviours] = await Promise.all([
        loadKeycodes(),
        loadBehaviours()
      ])

      keycodes.indexed = keyBy(keycodes, 'code')
      behaviours.indexed = keyBy(behaviours, 'code')

      setDefinitions({ keycodes, behaviours })
    }
  }, [setDefinitions])

  const handleUpdateKeymap = useMemo(() => function(km) {
    setEditingKeymap(prev => {
      const base = prev || keymap || {}
      return Object.assign({}, base, km, {
        behaviors: base.behaviors,
        combos: base.combos,
        conditional_layers: base.conditional_layers,
        macros: base.macros,
        layer_names: km.layer_names || base.layer_names
      })
    })
  }, [keymap, setEditingKeymap])

  const handleExtraChange = useMemo(() => function(field, value) {
    setEditingKeymap(prev => {
      const base = prev || keymap || {}
      return Object.assign({}, base, { [field]: value })
    })
  }, [keymap, setEditingKeymap])

  return (
    <>
      <Loader load={initialize}>
        <KeyboardPicker onSelect={handleKeyboardSelected} />
        <div id="actions">
          {source === 'local' && (
            <button disabled={!editingKeymap} onClick={handleCompile}>
              Save Local
            </button>
          )}
          {source === 'github' && (
            <button
              title="Commit keymap changes to GitHub repository"
              disabled={!editingKeymap && !keymap}
              onClick={handleCommitChanges}
            >
              {saving ? 'Saving' : 'Commit Changes'}
              {saving && <Spinner />}
            </button>
          )}
        </div>
        <div className="tab-bar" style={{ display: 'flex', gap: '4px', margin: '8px 0', borderBottom: '1px solid #ccc' }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '6px 12px',
                border: 'none',
                background: activeTab === tab.id ? '#333' : 'transparent',
                color: activeTab === tab.id ? '#fff' : '#333',
                cursor: 'pointer',
                fontWeight: activeTab === tab.id ? 'bold' : 'normal'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <DefinitionsContext.Provider value={definitions}>
          {activeTab === 'layers' && layout && keymap && (
            <Keyboard
              layout={layout}
              keymap={editingKeymap || keymap}
              onUpdate={handleUpdateKeymap}
            />
          )}
          {activeTab !== 'layers' && currentKeymap && (
            <div style={{ margin: '8px 0' }}>
              {activeTab === 'behaviors' ? (
                <div>
                  <p>Available behaviours (from ZMK). Reference these in your keymap with &amp;name.</p>
                  <textarea
                    readOnly
                    style={{ width: '100%', minHeight: '300px', fontFamily: 'monospace', fontSize: '12px' }}
                    value={JSON.stringify(definitions && definitions.behaviours, null, 2)}
                  />
                </div>
              ) : (
                <div>
                  <p>Edit the raw ZMK block for {EXTRA_FIELDS[activeTab]}. This will be written to your .keymap on commit.</p>
                  <textarea
                    style={{ width: '100%', minHeight: '300px', fontFamily: 'monospace', fontSize: '12px' }}
                    value={(currentKeymap && currentKeymap[EXTRA_FIELDS[activeTab]]) || ''}
                    onChange={e => handleExtraChange(EXTRA_FIELDS[activeTab], e.target.value)}
                  />
                </div>
              )}
            </div>
          )}
        </DefinitionsContext.Provider>
      </Loader>
      <GitHubLink className="github-link" />
    </>
  );
}

export default App;
