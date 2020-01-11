const factorio = {
  db: {},
  locale: {},
  selectedRecipes: {},
  collapsed: {},
  setup () {
    document.getElementsByTagName('body')[0].classList.add('loading', 'loading-lg')
    Promise
      .all([
        fetch('static/basedb.json'),
        fetch('static/extradb.json'),
        fetch('static/locale.json')
      ])
      .then((values) => {
        Promise
          .all(values.map(item => item.json()))
          .then(([basedb, extradb, locale]) => {
            factorio.db = basedb
            factorio.db.recipes = { ...factorio.db.recipes, ...extradb.recipes }
            factorio.db.items = { ...factorio.db.items, ...extradb.items }
            factorio.locale = locale

            for (const recipeId in factorio.db.recipes) {
              const recipe = factorio.db.recipes[recipeId]

              for (const mode of ['normal', 'expensive']) {
                if (recipe[mode] == null) {
                  continue
                }

                const recipeMode = recipe[mode]

                for (const ingrId in recipeMode.ingredients) {
                  if (recipeMode.results[ingrId] == null) {
                    continue
                  }

                  if (recipeMode.results[ingrId] > recipeMode.ingredients[ingrId]) {
                    recipeMode.results[ingrId] -= recipeMode.ingredients[ingrId]
                    delete recipeMode.ingredients[ingrId]
                  } else {
                    recipeMode.ingredients[ingrId] -= recipeMode.results[ingrId]
                    delete recipeMode.results[ingrId]
                  }
                }
              }
            }

            factorio.setupInputs()

            document.getElementsByTagName('body')[0].classList.remove('loading', 'loading-lg')
          })
      })
  },
  setupInputs () {
    const el = document.getElementById('item-select')
    el.addEventListener('change', function (ev) {
      factorio.selectedRecipes = {}
      factorio.collapsed = {}
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
  getItemWithComponents (id, mode = 'normal', neededQty = null, parentPath = '') {
    let itemsList = []

    const path = parentPath + '/' + id

    const recipes = factorio.db.items[id]
    const recipeId = factorio.selectedRecipes[path] || recipes[0]
    const recipe = factorio.db.recipes[recipeId]
    const recipeMode = (recipe[mode] != null ? recipe[mode] : recipe.normal)

    if (neededQty == null) {
      neededQty = recipeMode.results[id]
    }

    const item = {
      id: id,
      name: factorio.locale[id],
      path: path,
      children: false,
      neededQty: neededQty,
      recipe: {
        id: recipeId,
        ...recipeMode
      },
      alternativeRecipes: recipes,
      excess: Object.entries(recipeMode.results)
        .reduce(
          (result, [rid, rvalue]) => {
            if (rid !== id) {
              result[rid] = rvalue
            }
            return result
          },
          {}
        )
    }

    itemsList.push(item)

    for (const ingrId in item.recipe.ingredients) {
      item.children = true

      const ingrQty = item.recipe.ingredients[ingrId]
      const itemCraftAmount = item.recipe.results[item.id]

      itemsList = itemsList.concat(
        factorio.getItemWithComponents(
          ingrId,
          mode,
          (ingrQty / itemCraftAmount) * neededQty,
          path
        )
      )
    }

    return itemsList
  },
  handleCollapseExpand (ev) {
    if (factorio.collapsed[ev.target.dataset.path] === undefined) {
      factorio.collapsed[ev.target.dataset.path] = true
    } else {
      delete factorio.collapsed[ev.target.dataset.path]
    }

    factorio.redrawTable()
  },
  handleSelectRecipe (ev) {
    const targetPath = ev.target.dataset.path
    for (const selectedPath in factorio.selectedRecipes) {
      if (selectedPath.indexOf(targetPath) === 0) {
        delete factorio.selectedRecipes[selectedPath]
      }
    }
    factorio.selectedRecipes[targetPath] = ev.target.value
    factorio.redrawTable()
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
      document.getElementById('mode-select').value
    )
    let desiredQty = parseFloat(document.getElementById('desired-qty').value)
    if (isNaN(desiredQty)) {
      desiredQty = 0
    }
    if (document.getElementById('desired-qty-time-unit').value === 'min') {
      desiredQty = desiredQty / 60
    }

    const extras = { _aggregated: {}, _excess: {} }

    for (const item of itemWithComponents) {
      if (extras._aggregated[item.id] == null) {
        extras._aggregated[item.id] = {
          ...item,
          path: '/_aggregated/' + item.id,
          children: false,
          alternativeRecipes: []
        }
      } else {
        extras._aggregated[item.id].neededQty += item.neededQty
      }

      for (const excessId in item.excess) {
        if (extras._excess[excessId] == null) {
          extras._excess[excessId] = {
            id: excessId,
            name: factorio.locale[excessId],
            path: '/_excess/' + item.id,
            children: false,
            neededQty: item.excess[excessId],
            recipe: item.recipe,
            alternativeRecipes: []
          }
        } else {
          extras._excess[excessId].neededQty += item.neededQty
        }
      }
    }

    for (const extra in extras) {
      itemWithComponents.push({
        id: extra,
        name: { _aggregated: 'Aggregated', _excess: 'Excess production' }[extra],
        path: '/' + extra,
        children: Object.keys(extras[extra]).length > 0
      })

      itemWithComponents = itemWithComponents.concat(
        Object
          .values(extras[extra])
          .sort((a, b) => (factorio.locale[a.id] || a.id).localeCompare(factorio.locale[b.id] || b.id))
      )
    }

    const mainItem = itemWithComponents[0]
    const mainProductCraftPS = mainItem.recipe.results[mainItem.id] / mainItem.recipe.time
    const productionSpeed = desiredQty / mainProductCraftPS

    loop1: for (const item of itemWithComponents) {
      for (const collapsedPath in factorio.collapsed) {
        if (item.path !== collapsedPath && item.path.indexOf(collapsedPath) === 0) {
          continue loop1
        }
      }

      const row = tbody.insertRow()

      const itemNameCell = row.insertCell(-1)

      const pathSize = item.path.split('/')
      if (pathSize.length > 2) {
        itemNameCell.appendChild(document.createTextNode(`${' '.repeat(pathSize.length - 3)}↳ `))
      }

      if (item.children) {
        const collapseExpand = document.createElement('a')
        collapseExpand.classList.add('collapse-expand-button')
        collapseExpand.textContent = factorio.collapsed[item.path] != null ? '+' : '-'
        collapseExpand.dataset.path = item.path
        collapseExpand.addEventListener('click', factorio.handleCollapseExpand)

        itemNameCell.appendChild(collapseExpand)
      }

      itemNameCell.appendChild(document.createTextNode(item.name))

      if (extras[item.id] != null) {
        itemNameCell.colSpan = 8
        itemNameCell.classList.add('bold-text')
        continue
      }

      if (item.alternativeRecipes.length > 1) {
        itemNameCell.appendChild(document.createTextNode(' '))

        const select = document.createElement('select')
        select.dataset.path = item.path

        for (const alternativeRecipe of item.alternativeRecipes) {
          const option = document.createElement('option')
          option.text = factorio.locale[alternativeRecipe] || alternativeRecipe
          option.value = alternativeRecipe
          option.selected = factorio.selectedRecipes[item.path] === alternativeRecipe
          select.add(option)
        }

        select.addEventListener('change', factorio.handleSelectRecipe)

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
