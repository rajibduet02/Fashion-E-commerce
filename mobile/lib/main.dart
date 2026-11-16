import 'package:flutter/material.dart';

import 'src/models.dart';
import 'src/pages.dart';
import 'src/shop.dart';
import 'src/theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final shop = Shop();
  await shop.load();
  runApp(ShopScope(shop: shop, child: const AurelleApp()));
}

class AurelleApp extends StatelessWidget {
  const AurelleApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'AURELLE',
      debugShowCheckedModeBanner: false,
      theme: aurelleTheme(),
      home: const HouseShell(),
    );
  }
}

class HouseShell extends StatefulWidget {
  const HouseShell({super.key});

  @override
  State<HouseShell> createState() => _HouseShellState();
}

class _HouseShellState extends State<HouseShell> {
  int index = 0;
  String shopMode = 'all';

  void openProduct(Product product) {
    Navigator.of(
      context,
    ).push(MaterialPageRoute(builder: (_) => ProductPage(product: product)));
  }

  void openShop(String mode) => setState(() {
    shopMode = mode;
    index = 1;
  });

  @override
  Widget build(BuildContext context) {
    final shop = ShopScope.of(context);
    final pages = [
      HomePage(
        openShop: openShop,
        openProduct: openProduct,
        openTryOn: () => setState(() => index = 2),
      ),
      ShopPage(mode: shopMode, onOpen: openProduct, onMode: openShop),
      const TryOnPage(),
      BagPage(
        onCheckout: () => Navigator.of(
          context,
        ).push(MaterialPageRoute(builder: (_) => const CheckoutPage())),
      ),
      const AccountPage(),
    ];
    return Scaffold(
      appBar: AppBar(
        title: const Text('AURELLE'),
        actions: [
          IconButton(
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute(
                builder: (_) => SearchPage(onOpen: openProduct),
              ),
            ),
            icon: const Icon(Icons.search),
          ),
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: Badge(
              isLabelVisible: shop.count > 0,
              label: Text('${shop.count}'),
              child: IconButton(
                onPressed: () => setState(() => index = 3),
                icon: const Icon(Icons.shopping_bag_outlined),
              ),
            ),
          ),
        ],
      ),
      body: pages[index],
      bottomNavigationBar: NavigationBar(
        selectedIndex: index,
        onDestinationSelected: (value) => setState(() => index = value),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), label: 'Home'),
          NavigationDestination(
            icon: Icon(Icons.checkroom_outlined),
            label: 'Shop',
          ),
          NavigationDestination(
            icon: Icon(Icons.camera_outlined),
            label: 'Try on',
          ),
          NavigationDestination(
            icon: Icon(Icons.shopping_bag_outlined),
            label: 'Bag',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            label: 'Account',
          ),
        ],
      ),
    );
  }
}
