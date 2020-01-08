import json
from configparser import RawConfigParser
from collections import defaultdict

locale = RawConfigParser()
locale.read(['locale-en.cfg'])

locale_names = {}

for section_name in ['entity-name', 'item-name', 'recipe-name', 'fluid-name', 'equipment-name']:
    for option in locale.options(section_name):
        locale_names[option] = locale.get(section_name, option)

json.dump(locale_names, open('locale-en.json', 'w'), indent=2)


basedata = json.loads(open('data.json', 'rb').read().decode('utf16'))

db = {'recipes': {}, 'items': defaultdict(list)}

for recipe_name, data in basedata['recipe'].items():
    for mod in ['normal', 'expensive']:
        if mod != 'normal' and mod not in data:
            continue

        mod_data = data.get(mod, data)

        recipe_name = '{}:{}'.format(recipe_name, mod) if mod != 'normal' else recipe_name

        ingredients = {}

        for ingr in mod_data.get('ingredients', []):
            if isinstance(ingr, dict):
                ingredients[ingr['name']] = ingr['amount']
            else:
                ingredients[ingr[0]] = ingr[1]

        results = {}

        if 'result' in mod_data:
            results[mod_data['result']] = mod_data.get('result_count', 1)

        for result in mod_data.get('results', []):
            if isinstance(result, dict):
                results[result['name']] = result['amount']
            else:
                results[result[0]] = result[1]

        recipe = {
            'time': mod_data.get('energy_required', 0.5),
            'ingredients': ingredients,
            'results': results
        }

        db['recipes'][recipe_name] = recipe

        for resname, qty in recipe['results'].items():
            db['items'][resname].append(recipe_name)


json.dump(db, open('basedb.json', 'w'), indent=2)
