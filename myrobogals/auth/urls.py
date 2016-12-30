# These URLs are normally mapped to /admin/urls.py. This URLs file is 
# provided as a convenience to those who want to deploy these URLs elsewhere.
# This file is also used to provide a reliable view deployment for test purposes.

from django.conf.urls.defaults import *

urlpatterns = patterns('',
    (r'^login/$', 'myrobogals.auth.views.login'),
    (r'^logout/$', 'myrobogals.auth.views.logout'),
    (r'^password_change/$', 'myrobogals.auth.views.password_change'),
    (r'^password_change/done/$', 'myrobogals.auth.views.password_change_done'),
    (r'^password_reset/$', 'myrobogals.auth.views.password_reset'),
    (r'^password_reset/done/$', 'myrobogals.auth.views.password_reset_done'),
    (r'^reset/(?P<uidb36>[0-9A-Za-z]+)-(?P<token>.+)/$', 'myrobogals.auth.views.password_reset_confirm'),
    (r'^reset/done/$', 'myrobogals.auth.views.password_reset_complete'),
)
