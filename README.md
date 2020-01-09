# Factorio Crafting Guide

This is a simple tool to help in designing optimal assembly lines in [Factorio](https://factorio.com/),
based on the desired output.

See it running here: [https://davidrios.github.io/factorio-craft-guide/](https://davidrios.github.io/factorio-craft-guide/)


## Usage

Lets say I want to produce 36 [military science packs](https://wiki.factorio.com/Military_science_pack) per minute. I open the tool and fill in the fields, then I will be presented with a table like this: [see table](https://raw.githubusercontent.com/davidrios/factorio-craft-guide/master/docs/table1.png).

The columns "craft time", "craft qty" and "craft /s" are the base values for the item.

"Needed qty" specifies how many of that material you'll need to craft the needed quantity all the way to the root. For instance, 2 military science packs need 1 piercing round magazine, which in turn need 1 steel plate, which need 5 iron plates and so on.

"Needed /s" and "Needed /m" shows the amount of that material you'll need per second and per minute to meet the desired output. For the example above, you'll need to produce 18 steel plates per minute.

The items needed are separated by individual recipes, but at the end of the table you'll see an aggregated by material list. For the example above, according to the table you'll need to produce a total of 252 iron plates per minute.

The last column, "Needed crafting speed", is related to the crafting speed number show in-game, and you'll need the sum of the crafting speed of your assembly line to match the number. For instance, for a 3.0 crafting speed need, you could have 6 of assembly machine 1, which have 0.5 base crafting speed each, so 6 * 0.5 = 3.0.

I have built a compact line to output the example above in the game:

![](docs/military-pack-assembly-line.jpg)

Showing the crafting speed of the main assembly machine:

![](docs/assembly-machine-example.jpg)

And the output shown in-game:

![](docs/example-game-output.jpg)
