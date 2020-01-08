var factorio = {
  db: {},
  locale: {},
  setup () {
    document.getElementsByTagName('body')[0].classList.add('loading', 'loading-lg')
    Promise
      .all([
        fetch('/static/basedb.json'),
        fetch('/static/extradb.json'),
        fetch('/static/locale-en.json')
      ])
      .then((values) => {
        Promise
          .all(values.map(item => item.json()))
          .then(([basedb, extradb, locale]) => {
            factorio.db = basedb
            factorio.db.recipes = { ...factorio.db.recipes, ...extradb.recipes }
            factorio.db.items = { ...factorio.db.items, ...extradb.items }
            factorio.locale = locale

            factorio.setupInputs()

            document.getElementsByTagName('body')[0].classList.remove('loading', 'loading-lg')
          })
      })
  },
  setupInputs () {
    const el = document.getElementById('item-select')
    el.addEventListener('change', function (ev) {
      factorio.redrawTable()
    })

    for (const [itemName, itemId] of Object.keys(factorio.db.items).map(itemId => [factorio.locale[itemId] || itemId, itemId]).sort()) {
      const option = document.createElement('option')
      option.text = itemName
      option.value = itemId

      el.add(option)
    }

    document.getElementById('desired-qty').addEventListener('change', function () {
      factorio.redrawTable()
    })

    document.getElementById('desired-qty-time-unit').addEventListener('change', function () {
      factorio.redrawTable()
    })

    document.getElementById('mode-select').addEventListener('change', function () {
      factorio.redrawTable()
    })
  },
  getItemWithComponents (name, lastCraftLevel, neededQty) {
    if (lastCraftLevel == null) {
      lastCraftLevel = 0
    }

    if (neededQty == null) {
      neededQty = 1
    }

    const craftLevel = lastCraftLevel + 1

    let itemsList = []

    const item = { name: name, craftLevel: craftLevel, neededQty: neededQty, ...factorioDb[name] }
    itemsList.push(item)

    for (var componentName in item.components) {
      itemsList = itemsList.concat(factorio.getItemWithComponents(componentName, craftLevel, neededQty * item.components[componentName]))
    }

    return itemsList
  },
  redrawTable () {
    const tbody = document.getElementById('item-info-table-body')
    tbody.innerHTML = ''

    const itemName = document.getElementById('item-select').value
    if (itemName.trim().length === 0) {
      return
    }

    const itemWithComponents = factorio.getItemWithComponents(itemName)
    let desiredQty = parseFloat(document.getElementById('desired-qty').value)
    if (document.getElementById('desired-qty-time-unit').value === 'min') {
      desiredQty = desiredQty / 60
    }

    const mainItem = itemWithComponents[0]
    const mainProductCraftPS = mainItem.craftQty / mainItem.craftTime
    const productionSpeed = desiredQty / mainProductCraftPS

    for (const item of itemWithComponents) {
      const row = tbody.insertRow()

      row.insertCell(-1).textContent = item.craftLevel === 1 ? item.name : `${' '.repeat(item.craftLevel - 2)}↳ ${item.name}`
      row.insertCell(-1).textContent = item.craftTime.toFixed(2)
      row.insertCell(-1).textContent = item.craftQty

      const itemCraftPS = item.craftQty / item.craftTime
      row.insertCell(-1).textContent = itemCraftPS.toFixed(2)
      row.insertCell(-1).textContent = item.neededQty.toFixed(2)

      const prodPS = ((item.neededQty * mainProductCraftPS) / mainItem.craftQty) * productionSpeed
      row.insertCell(-1).textContent = prodPS.toFixed(2)
      row.insertCell(-1).textContent = (prodPS * 60).toFixed(2)

      row.insertCell(-1).textContent = `${((prodPS / itemCraftPS) * 100).toFixed(2)}%`
    }
  }
}

factorio.setup()
