var factorio = {
  db: {},
  locale: {},
  selectedRecipes: {},
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
      factorio.selectedRecipes = {}
      factorio.redrawTable()
    })

    const sortedItems = Object
      .keys(factorio.db.items)
      .map(itemId => [factorio.locale[itemId] || itemId, itemId])
      .sort((a, b) => a[0].localeCompare(b[0]))

    for (const [itemName, itemId] of sortedItems) {
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
  getItemWithComponents (id, mode = 'normal', selectedRecipes = {}, lastCraftLevel = 0, neededQty = null, lastIndex = -1) {
    const craftLevel = lastCraftLevel + 1
    let index = lastIndex + 1

    let itemsList = []

    const recipes = factorio.db.items[id]
    const recipeId = selectedRecipes[index] || recipes[0]
    const recipe = factorio.db.recipes[recipeId]
    const recipeMode = (recipe[mode] != null ? recipe[mode] : recipe.normal)

    if (neededQty == null) {
      neededQty = recipeMode.results[id]
    }

    const item = {
      id: id,
      name: factorio.locale[id],
      index: index,
      craftLevel: craftLevel,
      neededQty: neededQty,
      recipe: {
        id: recipeId,
        ...recipeMode
      },
      alternativeRecipes: recipes
    }

    itemsList.push(item)

    for (var ingrId in item.recipe.ingredients) {
      const ingrQty = item.recipe.ingredients[ingrId]
      const itemCraftAmount = item.recipe.results[item.id]

      itemsList = itemsList.concat(
        factorio.getItemWithComponents(
          ingrId,
          mode,
          selectedRecipes,
          craftLevel,
          (ingrQty / itemCraftAmount) * neededQty,
          index
        )
      )

      index = itemsList[itemsList.length - 1].index
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

    let itemWithComponents = factorio.getItemWithComponents(
      itemName,
      document.getElementById('mode-select').value,
      factorio.selectedRecipes
    )
    let desiredQty = parseFloat(document.getElementById('desired-qty').value)
    if (isNaN(desiredQty)) {
      desiredQty = 0
    }
    if (document.getElementById('desired-qty-time-unit').value === 'min') {
      desiredQty = desiredQty / 60
    }

    const aggregated = {}
    for (const item of itemWithComponents) {
      if (aggregated[item.id] == null) {
        aggregated[item.id] = { ...item, craftLevel: 2, alternativeRecipes: [] }
        continue
      }

      aggregated[item.id].neededQty += item.neededQty
    }

    itemWithComponents.push({ id: '_aggregated' })

    let lastIndex = itemWithComponents[itemWithComponents.length - 1].index
    itemWithComponents = itemWithComponents.concat(
      Object
        .values(aggregated)
        .map(item => {
          lastIndex += 1
          item.index = lastIndex
          return item
        })
        .sort((a, b) => (factorio.locale[a.id] || a.id).localeCompare(factorio.locale[b.id] || b.id))
    )

    const mainItem = itemWithComponents[0]
    const mainProductCraftPS = mainItem.recipe.results[mainItem.id] / mainItem.recipe.time
    const productionSpeed = desiredQty / mainProductCraftPS

    for (const item of itemWithComponents) {
      const row = tbody.insertRow()

      const itemNameCell = row.insertCell(-1)

      if (item.id === '_aggregated') {
        itemNameCell.innerHTML = '<strong>Aggregated</strong>'
        itemNameCell.colSpan = 8
        continue
      }

      itemNameCell.textContent = item.craftLevel === 1 ? item.name : `${' '.repeat(item.craftLevel - 2)}↳ ${item.name}`
      if (item.alternativeRecipes.length > 1) {
        itemNameCell.appendChild(document.createTextNode(' '))

        const select = document.createElement('select')
        select.name = `select-recipe-${item.craftLevel}`

        for (const alternativeRecipe of item.alternativeRecipes) {
          const option = document.createElement('option')
          option.text = factorio.locale[alternativeRecipe] || alternativeRecipe
          option.value = alternativeRecipe
          option.selected = factorio.selectedRecipes[item.index] === alternativeRecipe
          select.add(option)
        }

        select.addEventListener('change', function () {
          factorio.selectedRecipes[item.index] = select.value
          for (const selectedIndex in factorio.selectedRecipes) {
            if (selectedIndex > item.index) {
              delete factorio.selectedRecipes[selectedIndex]
            }
          }
          factorio.redrawTable()
        })

        itemNameCell.appendChild(select)
      }

      row.insertCell(-1).textContent = item.recipe.time.toFixed(2)
      row.insertCell(-1).textContent = item.recipe.results[item.id]

      const itemCraftPS = item.recipe.results[item.id] / item.recipe.time
      row.insertCell(-1).textContent = itemCraftPS.toFixed(2)
      row.insertCell(-1).textContent = item.neededQty.toFixed(2)

      const prodPS = ((item.neededQty * mainProductCraftPS) / mainItem.recipe.results[mainItem.id]) * productionSpeed
      row.insertCell(-1).textContent = prodPS.toFixed(2)
      row.insertCell(-1).textContent = (prodPS * 60).toFixed(2)

      row.insertCell(-1).textContent = (prodPS / itemCraftPS).toFixed(2)
    }
  }
}

factorio.setup()
