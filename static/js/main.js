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
  getItemWithComponents (id, mode, lastCraftLevel, neededQty) {
    if (lastCraftLevel == null) {
      lastCraftLevel = 0
    }

    if (neededQty == null) {
      neededQty = 1
    }

    if (mode == null) {
      mode = 'normal'
    }

    const craftLevel = lastCraftLevel + 1

    let itemsList = []

    const recipeId = factorio.db.items[id][0]
    const recipe = factorio.db.recipes[recipeId]

    const item = {
      id: id,
      name: factorio.locale[id],
      craftLevel: craftLevel,
      neededQty: neededQty,
      recipe: {
        id: recipeId,
        ...(recipe[mode] != null ? recipe[mode] : recipe.normal)
      }
    }

    itemsList.push(item)

    for (var ingrId in item.recipe.ingredients) {
      itemsList = itemsList.concat(
        factorio.getItemWithComponents(
          ingrId,
          mode,
          craftLevel,
          neededQty * item.recipe.ingredients[ingrId]
        )
      )
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

    const itemWithComponents = factorio.getItemWithComponents(itemName, document.getElementById('mode-select').value)
    let desiredQty = parseFloat(document.getElementById('desired-qty').value)
    if (document.getElementById('desired-qty-time-unit').value === 'min') {
      desiredQty = desiredQty / 60
    }

    const mainItem = itemWithComponents[0]
    const mainProductCraftPS = mainItem.recipe.results[mainItem.id] / mainItem.recipe.time
    const productionSpeed = desiredQty / mainProductCraftPS

    for (const item of itemWithComponents) {
      const row = tbody.insertRow()

      row.insertCell(-1).textContent = item.craftLevel === 1 ? item.name : `${' '.repeat(item.craftLevel - 2)}↳ ${item.name}`
      row.insertCell(-1).textContent = item.recipe.time.toFixed(2)
      row.insertCell(-1).textContent = item.recipe.results[item.id]

      const itemCraftPS = item.recipe.results[item.id] / item.recipe.time
      row.insertCell(-1).textContent = itemCraftPS.toFixed(2)
      row.insertCell(-1).textContent = item.neededQty.toFixed(2)

      const prodPS = ((item.neededQty * mainProductCraftPS) / mainItem.recipe.results[mainItem.id]) * productionSpeed
      row.insertCell(-1).textContent = prodPS.toFixed(2)
      row.insertCell(-1).textContent = (prodPS * 60).toFixed(2)

      row.insertCell(-1).textContent = `${((prodPS / itemCraftPS) * 100).toFixed(2)}%`
    }
  }
}

factorio.setup()
